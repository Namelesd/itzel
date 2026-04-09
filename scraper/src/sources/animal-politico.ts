/**
 * SCRAPER v4 — ITZEL
 * ============================================================
 * Mejoras vs v3:
 * - Rotación de User-Agents para evitar bloqueos
 * - Delays aleatorios entre fuentes
 * - Reintentos automáticos con backoff exponencial
 * - Extracción de autor en 6 campos distintos del RSS
 * - Limpiador inteligente de nombres de autor
 * - Detector de ubicación mejorado con variantes y patrones
 * - 15+ fuentes verificadas
 * ============================================================
 */

import Parser from 'rss-parser'
import { prisma } from '../../../src/lib/prisma'
import { extraerContenidoArticulo } from '../fetcher'

// ─── USER AGENTS ─────────────────────────────────────────────
/**
 * Rotamos entre varios User-Agents reales para que los
 * servidores no detecten un patrón de bot fijo.
 * Todos son navegadores reales en sistemas operativos reales.
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * DELAY ALEATORIO
 * ---------------
 * Espera entre min y max milisegundos.
 * Los humanos no hacen requests exactamente cada 0ms —
 * variar el tiempo entre requests reduce el bloqueo.
 */
function delay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── FUENTES ─────────────────────────────────────────────────
const FUENTES = [

 { nombre: 'La Jornada', slug: 'la-jornada', url: 'https://www.jornada.com.mx', rss: 'https://www.jornada.com.mx/rss/edicion.xml' },
  
]

// ─── ABREVIACIONES POR MEDIO ─────────────────────────────────
/**
 * DICCIONARIO DE ABREVIACIONES
 * ----------------------------
 * Mapea abreviaciones conocidas a su significado completo.
 * La clave es el slug del medio, el valor es un diccionario
 * de abreviación → descripción.
 *
 * Esto permite que "Redacción AN / LP" se muestre como
 * "Redacción de Aristegui Noticias — redactor LP"
 * en lugar de un nombre críptico sin contexto.
 */
const ABREVIACIONES_POR_MEDIO: Record<string, Record<string, string>> = {
  'aristegui-noticias': {
    'AN': 'Aristegui Noticias',
    'KC': 'redactor KC de Aristegui Noticias',
    'LP': 'redactor LP de Aristegui Noticias',
    'BJC': 'redactor BJC de Aristegui Noticias',
    'ARF': 'redactor ARF de Aristegui Noticias',
    'JSC': 'redactor JSC de Aristegui Noticias',
    'EC': 'redactor EC de Aristegui Noticias',
  },
  'aristegui-mexico': {
    'AN': 'Aristegui Noticias',
    'KC': 'redactor KC de Aristegui Noticias',
    'LP': 'redactor LP de Aristegui Noticias',
  },
  'la-jornada': {
    'LJ': 'La Jornada',
  },
  'sin-embargo': {
    'SE': 'Sin Embargo',
    'SEM': 'Sin Embargo MX',
  },
  'el-informador': {
    'EI': 'El Informador',
  },
  'proceso': {
    'PR': 'Proceso',
  },
}

/**
 * PATRONES DE NOMBRES NO PERSONALES
 * ----------------------------------
 * Regex que identifican si un string NO es el nombre
 * de una persona real sino una firma colectiva o técnica.
 *
 * Orden: del más específico al más general.
 */
const PATRONES_EDITORIAL = [
  { regex: /^redacc[ií]on/i, tipo: 'redaccion', desc: 'Nota de redacción colectiva' },
  { regex: /^staff/i, tipo: 'staff', desc: 'Nota del equipo editorial' },
  { regex: /^agencia/i, tipo: 'agencia', desc: 'Nota de agencia de noticias' },
  { regex: /^ap\b/i, tipo: 'agencia', desc: 'Associated Press' },
  { regex: /^reuters/i, tipo: 'agencia', desc: 'Reuters' },
  { regex: /^notimex/i, tipo: 'agencia', desc: 'Agencia Notimex' },
  { regex: /^afp/i, tipo: 'agencia', desc: 'Agence France-Presse' },
  { regex: /^efe\b/i, tipo: 'agencia', desc: 'Agencia EFE' },
  { regex: /^sun\./i, tipo: 'agencia', desc: 'Servicio Universal de Noticias (SUN)' },
  { regex: /^especial/i, tipo: 'especial', desc: 'Corresponsal especial' },
  { regex: /^corresponsal/i, tipo: 'corresponsal', desc: 'Corresponsal sin nombre' },
  { regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, tipo: 'email', desc: 'Identificado por correo electrónico' },
  { regex: /^[A-Z]{2,4}(\s*\/\s*[A-Z]{2,4})*$/, tipo: 'iniciales', desc: 'Firma por iniciales' },
]

/**
 * FUNCIÓN: interpretarAutor
 * -------------------------
 * Nivel 1: busca abreviaciones conocidas del medio.
 * Nivel 2: detecta patrones de firma no personal.
 * Nivel 3: si pasa los dos filtros, asume que es un nombre real.
 *
 * Devuelve:
 * - nombre: string limpio para mostrar
 * - isEditorial: true si es firma colectiva
 * - editorialDesc: descripción para mostrar al usuario
 */
function interpretarAutor(
  nombreRaw: string,
  medioSlug: string
): { nombre: string; isEditorial: boolean; editorialDesc: string | null } {
  const nombre = nombreRaw.trim()

  if (!nombre || nombre.length < 3) {
    return { nombre: 'Redacción', isEditorial: true, editorialDesc: 'Nota sin autor identificado' }
  }

  /**
   * NIVEL 1 — Abreviaciones conocidas por medio
   * Busca si el nombre contiene alguna abreviación del diccionario.
   * Ejemplo: "Redacción AN / LP" en aristegui → explica "AN" y "LP"
   */
  const abrevsMedio = ABREVIACIONES_POR_MEDIO[medioSlug] ?? {}
  for (const [abrev, significado] of Object.entries(abrevsMedio)) {
    if (nombre.toUpperCase().includes(abrev)) {
      const partes = nombre.split(/\s*\/\s*/)
      const descripcion = partes
        .map(p => {
          const pTrim = p.trim().toUpperCase()
          return abrevsMedio[pTrim]
            ? `"${p.trim()}" = ${abrevsMedio[pTrim]}`
            : p.trim()
        })
        .join(' · ')

      return {
        nombre,
        isEditorial: true,
        editorialDesc: `Firma colectiva: ${descripcion}`,
      }
    }
  }

  /**
   * NIVEL 2 — Patrones de firma no personal
   * Detecta redacciones, agencias, emails, solo iniciales.
   */
  for (const patron of PATRONES_EDITORIAL) {
    if (patron.regex.test(nombre)) {
      let desc = patron.desc

      /**
       * Para agencias conocidas por nombre en el texto,
       * agregamos el contexto del medio donde se publicó.
       */
      if (patron.tipo === 'agencia') {
        desc = `${desc} — distribuido por ${medioSlug.replace(/-/g, ' ')}`
      }

      /**
       * Para emails, extraemos el dominio como pista del origen.
       * "internet@elsiglodetorreon.com.mx" → "Correo de elsiglodetorreon.com.mx"
       */
      if (patron.tipo === 'email') {
        const dominio = nombre.split('@')[1] ?? ''
        desc = `Identificado por correo de ${dominio}`
      }

      return { nombre, isEditorial: true, editorialDesc: desc }
    }
  }

  /**
   * NIVEL 3 — Validación básica de nombre personal
   * Un nombre real generalmente tiene al menos dos palabras
   * y no contiene caracteres extraños.
   * Si tiene solo una palabra corta, lo marcamos como dudoso.
   */
  const palabras = nombre.split(/\s+/).filter(p => p.length > 1)
  if (palabras.length < 2) {
    return {
      nombre,
      isEditorial: true,
      editorialDesc: `Firma de una sola palabra — posiblemente redacción de ${medioSlug.replace(/-/g, ' ')}`,
    }
  }

  return { nombre, isEditorial: false, editorialDesc: null }
}

// ─── CATEGORÍAS ───────────────────────────────────────────────
const CATEGORIAS: Record<string, string> = {
  política: 'politics', gobierno: 'politics', elecciones: 'politics',
  congreso: 'politics', senado: 'politics', presidente: 'politics',
  sheinbaum: 'politics', morena: 'politics', diputado: 'politics',
  gobernador: 'politics', partido: 'politics', reforma: 'politics',
  legislativo: 'politics', ejecutivo: 'politics', tribunal: 'politics',
  crimen: 'crime', violencia: 'crime', homicidio: 'crime',
  narcotráfico: 'crime', seguridad: 'crime', asesinato: 'crime',
  cartel: 'crime', desaparecido: 'crime', feminicidio: 'crime',
  policía: 'crime', robo: 'crime', secuestro: 'crime',
  delincuencia: 'crime', extorsión: 'crime', balacera: 'crime',
  economía: 'economy', finanzas: 'economy', negocios: 'economy',
  inflación: 'economy', peso: 'economy', dólar: 'economy',
  pib: 'economy', inversión: 'economy', empresa: 'economy',
  banco: 'economy', mercado: 'economy', exportación: 'economy',
  aranceles: 'economy', comercio: 'economy', bolsa: 'economy',
  deportes: 'sports', fútbol: 'sports', olimpiadas: 'sports',
  mundial: 'sports', liga: 'sports', atleta: 'sports',
  béisbol: 'sports', boxeo: 'sports', natación: 'sports',
  tránsito: 'transit', accidente: 'transit', vialidad: 'transit',
  choque: 'transit', autopista: 'transit', carretera: 'transit',
  bloqueo: 'transit', manifestación: 'transit',
}

// ─── MUNICIPIOS ───────────────────────────────────────────────
/**
 * MUNICIPIOS CON VARIANTES
 * ------------------------
 * Cada entrada puede tener múltiples formas de escribirse.
 * La key es la forma canónica (con tilde) y el valor incluye
 * coordenadas y variantes sin tilde o abreviadas.
 *
 * Esto permite que "Gpe." encuentre "Guadalajara" y que
 * "Monterrey, NL" encuentre "Monterrey".
 */
const MUNICIPIOS: Record<string, { lat: number; lng: number; state: string; variantes?: string[] }> = {
  'Ciudad de México': { lat: 19.4326, lng: -99.1332, state: 'CDMX', variantes: ['CDMX', 'Ciudad de Mexico', 'DF', 'D.F.', 'Distrito Federal'] },
  'Guadalajara': { lat: 20.6597, lng: -103.3496, state: 'Jalisco', variantes: ['Gdl', 'Gpe.', 'ZMG'] },
  'Zapopan': { lat: 20.7214, lng: -103.3916, state: 'Jalisco', variantes: [] },
  'Tlaquepaque': { lat: 20.6419, lng: -103.3117, state: 'Jalisco', variantes: ['San Pedro Tlaquepaque'] },
  'Tonalá': { lat: 20.6236, lng: -103.2344, state: 'Jalisco', variantes: ['Tonala'] },
  'Monterrey': { lat: 25.6866, lng: -100.3161, state: 'Nuevo León', variantes: ['Monterey', 'MTY'] },
  'San Pedro Garza García': { lat: 25.6574, lng: -100.4019, state: 'Nuevo León', variantes: ['San Pedro', 'SPGG'] },
  'Puebla': { lat: 19.0414, lng: -98.2063, state: 'Puebla', variantes: ['Heroica Puebla'] },
  'Tijuana': { lat: 32.5149, lng: -117.0382, state: 'Baja California', variantes: ['TJ'] },
  'Mexicali': { lat: 32.6245, lng: -115.4523, state: 'Baja California', variantes: [] },
  'Ensenada': { lat: 31.8667, lng: -116.596, state: 'Baja California', variantes: [] },
  'Mérida': { lat: 20.9674, lng: -89.5926, state: 'Yucatán', variantes: ['Merida'] },
  'Cancún': { lat: 21.1619, lng: -86.8515, state: 'Quintana Roo', variantes: ['Cancun'] },
  'Playa del Carmen': { lat: 20.6296, lng: -87.0739, state: 'Quintana Roo', variantes: ['PDC'] },
  'Veracruz': { lat: 19.1738, lng: -96.1342, state: 'Veracruz', variantes: ['Puerto de Veracruz'] },
  'Xalapa': { lat: 19.5438, lng: -96.9102, state: 'Veracruz', variantes: ['Jalapa'] },
  'Coatzacoalcos': { lat: 18.15, lng: -94.4333, state: 'Veracruz', variantes: ['Coatza'] },
  'Culiacán': { lat: 24.8091, lng: -107.394, state: 'Sinaloa', variantes: ['Culiacan'] },
  'Mazatlán': { lat: 23.2494, lng: -106.4111, state: 'Sinaloa', variantes: ['Mazatlan'] },
  'Los Mochis': { lat: 25.794, lng: -108.9891, state: 'Sinaloa', variantes: [] },
  'Chihuahua': { lat: 28.6329, lng: -106.0691, state: 'Chihuahua', variantes: [] },
  'Ciudad Juárez': { lat: 31.6904, lng: -106.4245, state: 'Chihuahua', variantes: ['Juarez', 'Juárez', 'Cd. Juárez', 'Cd Juarez'] },
  'Oaxaca': { lat: 17.0732, lng: -96.7266, state: 'Oaxaca', variantes: ['Oaxaca de Juárez'] },
  'Acapulco': { lat: 16.8531, lng: -99.8237, state: 'Guerrero', variantes: [] },
  'Chilpancingo': { lat: 17.5506, lng: -99.5001, state: 'Guerrero', variantes: [] },
  'Morelia': { lat: 19.706, lng: -101.195, state: 'Michoacán', variantes: [] },
  'Uruapan': { lat: 19.4192, lng: -102.0632, state: 'Michoacán', variantes: [] },
  'León': { lat: 21.1221, lng: -101.6824, state: 'Guanajuato', variantes: ['Leon'] },
  'Irapuato': { lat: 20.6755, lng: -101.3554, state: 'Guanajuato', variantes: [] },
  'Celaya': { lat: 20.5236, lng: -100.8161, state: 'Guanajuato', variantes: [] },
  'Guanajuato': { lat: 21.019, lng: -101.2574, state: 'Guanajuato', variantes: [] },
  'Saltillo': { lat: 25.4232, lng: -100.9963, state: 'Coahuila', variantes: [] },
  'Torreón': { lat: 25.5428, lng: -103.418, state: 'Coahuila', variantes: ['Torreon'] },
  'Hermosillo': { lat: 29.0729, lng: -110.9559, state: 'Sonora', variantes: [] },
  'Ciudad Obregón': { lat: 27.4863, lng: -109.9401, state: 'Sonora', variantes: ['Cd. Obregon', 'Obregon'] },
  'Aguascalientes': { lat: 21.8818, lng: -102.2916, state: 'Aguascalientes', variantes: ['Ags'] },
  'Querétaro': { lat: 20.5888, lng: -100.3899, state: 'Querétaro', variantes: ['Queretaro'] },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855, state: 'San Luis Potosí', variantes: ['SLP', 'San Luis Potosi'] },
  'Toluca': { lat: 19.2826, lng: -99.6557, state: 'Estado de México', variantes: [] },
  'Ecatepec': { lat: 19.6012, lng: -99.0598, state: 'Estado de México', variantes: [] },
  'Naucalpan': { lat: 19.4797, lng: -99.2378, state: 'Estado de México', variantes: [] },
  'Durango': { lat: 24.0277, lng: -104.6532, state: 'Durango', variantes: ['Victoria de Durango'] },
  'Tepic': { lat: 21.5042, lng: -104.8945, state: 'Nayarit', variantes: [] },
  'Tuxtla Gutiérrez': { lat: 16.7521, lng: -93.1151, state: 'Chiapas', variantes: ['Tuxtla Gutierrez', 'Tuxtla'] },
  'San Cristóbal de las Casas': { lat: 16.737, lng: -92.6376, state: 'Chiapas', variantes: ['San Cristobal'] },
  'Villahermosa': { lat: 17.9869, lng: -92.9303, state: 'Tabasco', variantes: [] },
  'Campeche': { lat: 19.8301, lng: -90.5349, state: 'Campeche', variantes: [] },
  'Chetumal': { lat: 18.5001, lng: -88.2961, state: 'Quintana Roo', variantes: [] },
  'Colima': { lat: 19.2452, lng: -103.7241, state: 'Colima', variantes: [] },
  'La Paz': { lat: 24.1426, lng: -110.3128, state: 'Baja California Sur', variantes: [] },
  'Los Cabos': { lat: 22.8905, lng: -109.9167, state: 'Baja California Sur', variantes: ['Cabo San Lucas', 'San José del Cabo'] },
  'Zacatecas': { lat: 22.7709, lng: -102.5832, state: 'Zacatecas', variantes: [] },
  'Cuernavaca': { lat: 18.9242, lng: -99.2216, state: 'Morelos', variantes: [] },
  'Pachuca': { lat: 20.1011, lng: -98.7591, state: 'Hidalgo', variantes: [] },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375, state: 'Tlaxcala', variantes: [] },
  'Tapachula': { lat: 14.9048, lng: -92.2622, state: 'Chiapas', variantes: [] },
  'Matamoros': { lat: 25.8691, lng: -97.5027, state: 'Tamaulipas', variantes: [] },
  'Reynosa': { lat: 26.0921, lng: -98.2766, state: 'Tamaulipas', variantes: [] },
  'Nuevo Laredo': { lat: 27.476, lng: -99.5161, state: 'Tamaulipas', variantes: [] },
  'Tampico': { lat: 22.2553, lng: -97.8686, state: 'Tamaulipas', variantes: [] },
  // Alcaldías de CDMX
  'Coyoacán': { lat: 19.3467, lng: -99.1617, state: 'CDMX', variantes: ['Coyoacan'] },
  'Iztapalapa': { lat: 19.3573, lng: -99.0505, state: 'CDMX', variantes: [] },
  'Gustavo A. Madero': { lat: 19.4964, lng: -99.1171, state: 'CDMX', variantes: ['GAM'] },
  'Álvaro Obregón': { lat: 19.3585, lng: -99.2035, state: 'CDMX', variantes: ['Alvaro Obregon'] },
  'Tlalpan': { lat: 19.2936, lng: -99.1619, state: 'CDMX', variantes: [] },
  'Xochimilco': { lat: 19.2569, lng: -99.1027, state: 'CDMX', variantes: [] },
  'Benito Juárez': { lat: 19.3984, lng: -99.1577, state: 'CDMX', variantes: ['Benito Juarez'] },
  'Cuauhtémoc': { lat: 19.4269, lng: -99.1435, state: 'CDMX', variantes: ['Cuauhtemoc'] },
}

const ESTADOS: Record<string, { lat: number; lng: number; variantes?: string[] }> = {
  'Aguascalientes': { lat: 21.8818, lng: -102.2916, variantes: ['Ags.'] },
  'Baja California': { lat: 30.8406, lng: -115.2838, variantes: ['BC', 'B.C.'] },
  'Baja California Sur': { lat: 25.0, lng: -111.3333, variantes: ['BCS'] },
  'Campeche': { lat: 19.0, lng: -90.5 },
  'Chiapas': { lat: 16.75, lng: -92.6333 },
  'Chihuahua': { lat: 28.6329, lng: -106.0691, variantes: ['Chih.'] },
  'Coahuila': { lat: 27.0, lng: -102.0, variantes: ['Coah.'] },
  'Colima': { lat: 19.2452, lng: -103.7241 },
  'Durango': { lat: 24.0277, lng: -104.6532, variantes: ['Dgo.'] },
  'Estado de México': { lat: 19.4969, lng: -99.7233, variantes: ['Edomex', 'EdoMex', 'Estado de Mexico'] },
  'Guanajuato': { lat: 21.019, lng: -101.2574, variantes: ['Gto.'] },
  'Guerrero': { lat: 17.4392, lng: -99.5451, variantes: ['Gro.'] },
  'Hidalgo': { lat: 20.1011, lng: -98.7591, variantes: ['Hgo.'] },
  'Jalisco': { lat: 20.6597, lng: -103.3496, variantes: ['Jal.'] },
  'Michoacán': { lat: 19.5665, lng: -101.7068, variantes: ['Michoacan', 'Mich.'] },
  'Morelos': { lat: 18.9242, lng: -99.2216, variantes: ['Mor.'] },
  'Nayarit': { lat: 21.7514, lng: -104.8455, variantes: ['Nay.'] },
  'Nuevo León': { lat: 25.5922, lng: -99.9962, variantes: ['Nuevo Leon', 'NL', 'N.L.'] },
  'Oaxaca': { lat: 17.0732, lng: -96.7266, variantes: ['Oax.'] },
  'Puebla': { lat: 19.0414, lng: -98.2063, variantes: ['Pue.'] },
  'Querétaro': { lat: 20.5888, lng: -100.3899, variantes: ['Queretaro', 'Qro.'] },
  'Quintana Roo': { lat: 19.1817, lng: -88.4791, variantes: ['QR', 'Q.Roo'] },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855, variantes: ['San Luis Potosi', 'SLP'] },
  'Sinaloa': { lat: 24.8091, lng: -107.394, variantes: ['Sin.'] },
  'Sonora': { lat: 29.0729, lng: -110.9559, variantes: ['Son.'] },
  'Tabasco': { lat: 17.9869, lng: -92.9303, variantes: ['Tab.'] },
  'Tamaulipas': { lat: 24.2669, lng: -98.8363, variantes: ['Tamps.'] },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375, variantes: ['Tlax.'] },
  'Veracruz': { lat: 19.1738, lng: -96.1342, variantes: ['Ver.'] },
  'Yucatán': { lat: 20.9674, lng: -89.5926, variantes: ['Yucatan', 'Yuc.'] },
  'Zacatecas': { lat: 22.7709, lng: -102.5832, variantes: ['Zac.'] },
  'CDMX': { lat: 19.4326, lng: -99.1332, variantes: ['Ciudad de México', 'DF', 'D.F.'] },
}

// ─── FUNCIONES DE DETECCIÓN ───────────────────────────────────

function detectarCategoria(texto: string): string {
  const lower = texto.toLowerCase()
  for (const [keyword, categoria] of Object.entries(CATEGORIAS)) {
    if (lower.includes(keyword)) return categoria
  }
  return 'civil'
}

/**
 * FUNCIÓN: detectarUbicacion
 * --------------------------
 * 3 pasos de detección:
 *
 * Paso 1 — Municipio exacto o variante
 * Paso 2 — Patrón contextual: "en [ciudad]", "desde [ciudad]"
 * Paso 3 — Estado exacto o variante/abreviación
 */
function detectarUbicacion(texto: string) {
  /**
   * PASO 1: Municipio exacto o variante
   */
  for (const [municipio, datos] of Object.entries(MUNICIPIOS)) {
    const toCheck = [municipio, ...(datos.variantes ?? [])]
    for (const variante of toCheck) {
      if (texto.includes(variante)) {
        return {
          municipality: municipio,
          lat: datos.lat,
          lng: datos.lng,
          state: datos.state,
        }
      }
    }
  }

  /**
   * PASO 2: Patrones contextuales
   * Detecta "en Guadalajara", "desde Monterrey", "el municipio de X"
   * Esto captura casos donde el nombre está precedido por una preposición
   * o por la palabra "municipio" — más confiable que solo el nombre solo.
   */
  const patronContextual = /\b(?:en|desde|del?|municipio\s+de|ciudad\s+de|capital\s+de)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{3,25})/g
  let match
  while ((match = patronContextual.exec(texto)) !== null) {
    const candidato = match[1].trim()
    for (const [municipio, datos] of Object.entries(MUNICIPIOS)) {
      if (municipio.toLowerCase() === candidato.toLowerCase() ||
          (datos.variantes ?? []).some(v => v.toLowerCase() === candidato.toLowerCase())) {
        return {
          municipality: municipio,
          lat: datos.lat,
          lng: datos.lng,
          state: datos.state,
        }
      }
    }
  }

  /**
   * PASO 3: Estado exacto, variante o abreviación
   */
  for (const [estado, datos] of Object.entries(ESTADOS)) {
    const toCheck = [estado, ...(datos.variantes ?? [])]
    for (const variante of toCheck) {
      if (texto.includes(variante)) {
        return {
          municipality: null,
          lat: datos.lat,
          lng: datos.lng,
          state: estado,
        }
      }
    }
  }

  return { municipality: null, lat: null, lng: null, state: null }
}

/**
 * FUNCIÓN: limpiarTexto
 * ---------------------
 * Elimina HTML, decodifica entidades, corrige encoding roto
 * y limita a 300 caracteres para respetar copyright.
 */
function limpiarTexto(texto: string): string {
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

function generarSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

/**
 * FUNCIÓN: obtenerOCrearPeriodista
 * ----------------------------------
 * Usa interpretarAutor para determinar si es periodista real
 * o firma editorial. Guarda ambos tipos pero con metadata diferente.
 *
 * Los editoriales tienen isEditorial: true y su descripción en bio.
 * Esto permite a la UI mostrarlos diferente — sin score individual
 * y con badge "Redacción" en lugar de "Activo".
 */
async function obtenerOCrearPeriodista(
  nombreRaw: string,
  medioId: string,
  medioSlug: string
): Promise<string | null> {
  const { nombre, isEditorial, editorialDesc } = interpretarAutor(nombreRaw, medioSlug)
  const slug = generarSlug(nombre)
  if (!slug || slug.length < 3) return null

  try {
    const periodista = await prisma.journalist.upsert({
      where: { slug },
      update: {},
      create: {
        name: nombre,
        slug,
        status: 'active',
        fidelity: 0,
        isEditorial,
        bio: editorialDesc,
        mediaId: medioId,
      },
    })
    return periodista.id
  } catch {
    return null
  }
}

// ─── SCRAPE POR FUENTE ────────────────────────────────────────

async function scrapeFuente(fuente: typeof FUENTES[0], intento = 1): Promise<{ insertados: number; errores: number }> {
  const parser = new Parser({
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    timeout: 20000,
    customFields: {
      item: [
        ['dc:creator', 'creator'],
        ['author', 'author'],
        ['media:credit', 'mediaCredit'],
        ['itunes:author', 'itunesAuthor'],
      ],
    },
  })

  console.log(`\nScrapeando ${fuente.nombre}${intento > 1 ? ` (intento ${intento})` : ''}...`)

let feed
try {
  /**
   * LIMPIEZA DE BOM Y CARACTERES PREVIOS AL XML
   * --------------------------------------------
   * Algunos servidores como La Jornada devuelven caracteres
   * basura antes del tag <?xml> o <rss>.
   * Hacemos fetch manual, limpiamos el texto y luego parseamos.
   *
   * trim() elimina espacios y saltos de línea al inicio.
   * El replace elimina el BOM (U+FEFF) si está presente.
   * slice desde el primer '<' garantiza que empezamos en el XML.
   */
  const response = await fetch(fuente.rss, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'es-MX,es;q=0.9',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(20000),
  })

  const rawText = await response.text()
const cleanText = rawText
  .replace(/^\uFEFF/, '')
  .replace(/^[\s\S]*?(?=<\?xml|<rss|<feed)/, '')
  // Entidades HTML inválidas → &amp;
  .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
  // Tags de cierre sin apertura como </br> </img> </input>
  .replace(/<\/(br|img|input|hr|meta|link|area|base|col|embed|param|source|track|wbr)\s*>/gi, '')
  // Tags de apertura self-closing mal formados
  .replace(/<(br|img|input|hr|meta|link|area|base|col|embed|param|source|track|wbr)(\s[^>]*)?\s*(?<!\/)>/gi, '<$1$2 />')
  // Atributos sin valor → atributo="atributo"
  .replace(/(\s)([a-zA-Z-]+)(?=[\s>\/])/g, (match, space, attr) => {
    const sinValor = ['disabled', 'checked', 'selected', 'readonly', 'multiple', 'autofocus', 'autoplay', 'controls', 'default', 'defer', 'formnovalidate', 'hidden', 'ismap', 'loop', 'novalidate', 'open', 'required', 'reversed', 'scoped', 'seamless', 'allowfullscreen', 'async', 'loading', 'muted']
    return sinValor.includes(attr.toLowerCase()) ? `${space}${attr}="${attr}"` : match
  })
  .trim()

  feed = await parser.parseString(cleanText)
} catch (error: any) {
    /**
     * REINTENTOS CON BACKOFF EXPONENCIAL
     * ------------------------------------
     * Si falla, esperamos 2^intento segundos antes de reintentar.
     * Intento 1 falla → espera 2s → intento 2
     * Intento 2 falla → espera 4s → intento 3
     * Intento 3 falla → registra error y sigue con la siguiente fuente
     */
    if (intento < 3) {
      const waitMs = Math.pow(2, intento) * 1000
      console.log(`  ⚠ Error: ${error.message}. Reintentando en ${waitMs / 1000}s...`)
      await delay(waitMs, waitMs + 500)
      return scrapeFuente(fuente, intento + 1)
    }
    console.log(`  ✗ ${fuente.nombre}: ${error.message} (3 intentos fallidos)`)
    return { insertados: 0, errores: 1 }
  }

  console.log(`  ${feed.items.length} artículos en RSS`)

  const medio = await prisma.media.upsert({
    where: { slug: fuente.slug },
    update: { name: fuente.nombre },
    create: { name: fuente.nombre, slug: fuente.slug, url: fuente.url, rss: fuente.rss, verified: true },
  })

  let insertados = 0

  for (const item of feed.items) {
    if (!item.link || !item.title) continue

    const titulo = limpiarTexto(item.title)
    const excerpt = item.contentSnippet
      ? limpiarTexto(item.contentSnippet)
      : item.summary ? limpiarTexto(item.summary) : null
/**
 * FETCH DEL CONTENIDO COMPLETO
 * ----------------------------
 * Intentamos obtener más texto del artículo para mejorar
 * el análisis de fidelidad.
 *
 * Solo hacemos fetch de artículos que no hemos analizado
 * todavía — verificamos si ya existe en la DB primero.
 *
 * Si el fetch falla, usamos el excerpt del RSS como fallback.
 */
const articuloExistente = await prisma.article.findUnique({
  where: { url: item.link },
  select: { id: true, aiAnalyzed: true, fidelityScore: true },
})

let contenidoCompleto: string | null = null
if (!articuloExistente?.aiAnalyzed) {
  contenidoCompleto = await extraerContenidoArticulo(item.link)
if (contenidoCompleto) {
  console.log(`    [fetch] ✓ ${contenidoCompleto.length} chars`)
} else {
  console.log(`    [fetch] ✗ sin contenido`)
}
}

const textoAnalisis = contenidoCompleto
  ? `${titulo} ${contenidoCompleto}`
  : `${titulo} ${excerpt ?? ''}`

const geo = detectarUbicacion(textoAnalisis)
const categoria = detectarCategoria(textoAnalisis)

/**
 * SCORE DE FIDELIDAD EN EL SCRAPER
 * ----------------------------------
 * Calculamos el score aquí usando el texto completo
 * si está disponible, o el excerpt como fallback.
 * Lo guardamos directamente en el artículo.
 */
const { calcularFidelidad } = await import('../../../src/lib/fidelity')
const fidelityResult = textoAnalisis.length > 80
  ? calcularFidelidad(titulo, contenidoCompleto ?? excerpt)
  : null

    /**
     * EXTRACCIÓN DE AUTOR EN MÚLTIPLES CAMPOS
     * -----------------------------------------
     * Probamos campos en orden de confiabilidad:
     * dc:creator > author > itunes:author > media:credit > "Por X" en excerpt
     */
    let autorNombre =
      (item as any).creator ||
      item.author ||
      (item as any).itunesAuthor ||
      (item as any).mediaCredit ||
      null

    /**
     * EXTRACCIÓN DE "Por X" EN EL EXCERPT
     * ------------------------------------
     * Muchos medios mexicanos ponen el autor al inicio del texto:
     * "Por Carmen Aristegui.- El presidente..."
     * Este regex lo detecta y extrae el nombre.
     */
    if (!autorNombre && excerpt) {
      const matchPor = excerpt.match(/^Por\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/u)
      if (matchPor) autorNombre = matchPor[1]
    }

    const journalistId = autorNombre
      ? await obtenerOCrearPeriodista(autorNombre, medio.id, fuente.slug)
      : null
const aiSignals = Array.isArray(fidelityResult?.signals)
  ? JSON.parse(JSON.stringify(fidelityResult.signals))
  : undefined
    try {
      await prisma.article.upsert({
  where: { url: item.link },
  update: {
    journalistId,
    lat: geo.lat,
    lng: geo.lng,
    municipality: geo.municipality,
    state: geo.state,
    fidelityScore: fidelityResult?.total ?? null,
    aiAnalyzed: !!contenidoCompleto,
    aiSignals,

  },
  create: {
    title: titulo,
    url: item.link,
    excerpt,
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    category: categoria,
    municipality: geo.municipality,
    lat: geo.lat,
    lng: geo.lng,
    state: geo.state,
    mediaId: medio.id,
    journalistId,
    fidelityScore: fidelityResult?.total ?? null,
    aiAnalyzed: !!contenidoCompleto,
    aiSignals,
  },
})
      insertados++
      const autorLog = autorNombre ? ` — ${autorNombre}` : ''
      console.log(`  ✓ ${titulo.slice(0, 60)}${autorLog}`)
    } catch {
      // duplicado, ignorar
    }
  }

  return { insertados, errores: 0 }
}

// ─── MAIN ─────────────────────────────────────────────────────
async function scrape() {
  console.log('ITZEL — Scraper v4')
  console.log('==================')
  console.log(`Fuentes: ${FUENTES.length}`)
  console.log(`Inicio: ${new Date().toLocaleString('es-MX')}`)

  let totalInsertados = 0
  let totalErrores = 0

  for (const fuente of FUENTES) {
    const resultado = await scrapeFuente(fuente)
    totalInsertados += resultado.insertados
    totalErrores += resultado.errores

    await prisma.scrapeLog.create({
      data: { source: fuente.slug, count: resultado.insertados, errors: resultado.errores },
    })

    /**
     * DELAY ENTRE FUENTES
     * -------------------
     * Esperamos entre 1 y 3 segundos entre cada fuente.
     * Esto reduce la posibilidad de que los servidores
     * detecten un patrón de scraping y nos bloqueen.
     */
    await delay(1000, 3000)
  }

  console.log('\n==================')
  console.log(`Total insertados: ${totalInsertados}`)
  console.log(`Fuentes con error: ${totalErrores}`)
  console.log(`Fin: ${new Date().toLocaleString('es-MX')}`)

  await prisma.$disconnect()
}

scrape()