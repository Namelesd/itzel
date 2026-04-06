/**
 * SCRAPER v3 — 10 FUENTES VERIFICADAS
 * ============================================================
 * QUÉ CAMBIÓ vs v2:
 * - 10 fuentes con URLs de RSS verificadas y activas en 2026
 * - Todas obtenidas de las páginas oficiales de RSS de cada medio
 * - Aristegui ahora usa su URL correcta del subdomain editorial
 * - Agregamos Heraldo, Vanguardia, Presencia, El Informador e Infobae MX
 *
 * SOBRE COPYRIGHT:
 * - Solo guardamos título, URL, excerpt (máx 300 chars) y metadata
 * - Nunca el artículo completo
 * - El excerpt viene del propio RSS que el medio publica para compartir
 * - Siempre linkamos al artículo original — no reemplazamos la visita
 * ============================================================
 */

import Parser from 'rss-parser'
import { prisma } from '../../../src/lib/prisma'

/**
 * FUENTES VERIFICADAS
 * -------------------
 * Cada URL de RSS fue verificada contra las páginas oficiales
 * de cada medio. Si una falla, el scraper continúa con las demás.
 */
const FUENTES = [
  {
    nombre: 'La Jornada',
    slug: 'la-jornada',
    url: 'https://www.jornada.com.mx',
    rss: 'https://www.jornada.com.mx/rss/edicion.xml',
  },
  {
    nombre: 'Aristegui Noticias',
    slug: 'aristegui-noticias',
    url: 'https://aristeguinoticias.com',
    rss: 'https://editorial.aristeguinoticias.com/feed/',
  },
  {
    nombre: 'Aristegui — México',
    slug: 'aristegui-mexico',
    url: 'https://aristeguinoticias.com',
    rss: 'https://editorial.aristeguinoticias.com/category/mexico/feed/',
  },
  {
    nombre: 'El Siglo de Torreón',
    slug: 'siglo-torreon',
    url: 'https://www.elsiglodetorreon.com.mx',
    rss: 'https://elsiglodetorreon.com.mx/index.xml',
  },
  {
    nombre: 'Vanguardia',
    slug: 'vanguardia',
    url: 'https://vanguardia.com.mx',
    rss: 'https://vanguardia.com.mx/rss.xml',
  },
  {
    nombre: 'El Informador Jalisco',
    slug: 'el-informador',
    url: 'https://www.informador.mx',
    rss: 'https://informador.mx/rss/mexico.xml',
  },
   {
    nombre: 'SDP Noticias',
    slug: 'sdp-noticias',
    url: 'https://www.sdpnoticias.com',
    rss: 'https://www.sdpnoticias.com/feed/',
  },
  {
    nombre: 'El Debate',
    slug: 'el-debate',
    url: 'https://www.debate.com.mx',
    rss: 'https://www.debate.com.mx/rss/portada.xml',
  },
  {
    nombre: 'Publimetro México',
    slug: 'publimetro',
    url: 'https://www.publimetro.com.mx',
    rss: 'https://www.publimetro.com.mx/feed/',
  },
  {
    nombre: 'Mural Guadalajara',
    slug: 'mural',
    url: 'https://mural.com.mx',
    rss: 'https://mural.com.mx/rss/portada.xml',
  },
    {
    nombre: 'Proceso',
    slug: 'proceso',
    url: 'https://www.proceso.com.mx',
    rss: 'https://www.proceso.com.mx/rss/feed.html?r=155',
  },
  {
    nombre: 'Expansión',
    slug: 'expansion',
    url: 'https://expansion.mx',
    rss: 'https://expansion.mx/rss/ultimas-noticias.xml',
  },
  {
    nombre: '8 Columnas',
    slug: '8-columnas',
    url: 'https://8columnas.com.mx',
    rss: 'https://8columnas.com.mx/feed',
  },
]
/**
 * CATEGORÍAS EXPANDIDAS
 * ---------------------
 * Más keywords para detectar mejor las categorías.
 * El orden importa — la primera coincidencia gana.
 */
const CATEGORIAS: Record<string, string> = {
  política: 'politics', gobierno: 'politics', elecciones: 'politics',
  congreso: 'politics', senado: 'politics', presidente: 'politics',
  sheinbaum: 'politics', morena: 'politics', diputado: 'politics',
  gobernador: 'politics', partido: 'politics', reforma: 'politics',
  crimen: 'crime', violencia: 'crime', homicidio: 'crime',
  narcotráfico: 'crime', seguridad: 'crime', asesinato: 'crime',
  cartel: 'crime', desaparecido: 'crime', feminicidio: 'crime',
  policía: 'crime', robo: 'crime', secuestro: 'crime',
  economía: 'economy', finanzas: 'economy', negocios: 'economy',
  inflación: 'economy', peso: 'economy', dólar: 'economy',
  pib: 'economy', inversión: 'economy', empresa: 'economy',
  banco: 'economy', mercado: 'economy', exportación: 'economy',
  deportes: 'sports', fútbol: 'sports', olimpiadas: 'sports',
  mundial: 'sports', liga: 'sports', atleta: 'sports',
  béisbol: 'sports', boxeo: 'sports', natación: 'sports',
  tránsito: 'transit', accidente: 'transit', vialidad: 'transit',
  choque: 'transit', autopista: 'transit', carretera: 'transit',
}

/**
 * MUNICIPIOS CON COORDENADAS
 * --------------------------
 * 30 municipios mexicanos con sus coordenadas GPS exactas.
 * Expandido vs v2 para cubrir más ciudades medianas.
 */
const MUNICIPIOS: Record<string, { lat: number; lng: number; state: string }> = {
  'Ciudad de México': { lat: 19.4326, lng: -99.1332, state: 'CDMX' },
  'CDMX': { lat: 19.4326, lng: -99.1332, state: 'CDMX' },
  'Ciudad de Mexico': { lat: 19.4326, lng: -99.1332, state: 'CDMX' },
  'Guadalajara': { lat: 20.6597, lng: -103.3496, state: 'Jalisco' },
  'Zapopan': { lat: 20.7214, lng: -103.3916, state: 'Jalisco' },
  'Tlaquepaque': { lat: 20.6419, lng: -103.3117, state: 'Jalisco' },
  'Tonalá': { lat: 20.6236, lng: -103.2344, state: 'Jalisco' },
  'Tonala': { lat: 20.6236, lng: -103.2344, state: 'Jalisco' },
  'Monterrey': { lat: 25.6866, lng: -100.3161, state: 'Nuevo León' },
  'San Pedro Garza García': { lat: 25.6574, lng: -100.4019, state: 'Nuevo León' },
  'Puebla': { lat: 19.0414, lng: -98.2063, state: 'Puebla' },
  'Tijuana': { lat: 32.5149, lng: -117.0382, state: 'Baja California' },
  'Mexicali': { lat: 32.6245, lng: -115.4523, state: 'Baja California' },
  'Ensenada': { lat: 31.8667, lng: -116.5960, state: 'Baja California' },
  'Mérida': { lat: 20.9674, lng: -89.5926, state: 'Yucatán' },
  'Merida': { lat: 20.9674, lng: -89.5926, state: 'Yucatán' },
  'Cancún': { lat: 21.1619, lng: -86.8515, state: 'Quintana Roo' },
  'Cancun': { lat: 21.1619, lng: -86.8515, state: 'Quintana Roo' },
  'Playa del Carmen': { lat: 20.6296, lng: -87.0739, state: 'Quintana Roo' },
  'Veracruz': { lat: 19.1738, lng: -96.1342, state: 'Veracruz' },
  'Xalapa': { lat: 19.5438, lng: -96.9102, state: 'Veracruz' },
  'Coatzacoalcos': { lat: 18.1500, lng: -94.4333, state: 'Veracruz' },
  'Culiacán': { lat: 24.8091, lng: -107.3940, state: 'Sinaloa' },
  'Culiacan': { lat: 24.8091, lng: -107.3940, state: 'Sinaloa' },
  'Mazatlán': { lat: 23.2494, lng: -106.4111, state: 'Sinaloa' },
  'Mazatlan': { lat: 23.2494, lng: -106.4111, state: 'Sinaloa' },
  'Los Mochis': { lat: 25.7940, lng: -108.9891, state: 'Sinaloa' },
  'Chihuahua': { lat: 28.6329, lng: -106.0691, state: 'Chihuahua' },
  'Juárez': { lat: 31.6904, lng: -106.4245, state: 'Chihuahua' },
  'Juarez': { lat: 31.6904, lng: -106.4245, state: 'Chihuahua' },
  'Ciudad Juárez': { lat: 31.6904, lng: -106.4245, state: 'Chihuahua' },
  'Oaxaca': { lat: 17.0732, lng: -96.7266, state: 'Oaxaca' },
  'Acapulco': { lat: 16.8531, lng: -99.8237, state: 'Guerrero' },
  'Chilpancingo': { lat: 17.5506, lng: -99.5001, state: 'Guerrero' },
  'Morelia': { lat: 19.7060, lng: -101.1950, state: 'Michoacán' },
  'Uruapan': { lat: 19.4192, lng: -102.0632, state: 'Michoacán' },
  'León': { lat: 21.1221, lng: -101.6824, state: 'Guanajuato' },
  'Leon': { lat: 21.1221, lng: -101.6824, state: 'Guanajuato' },
  'Irapuato': { lat: 20.6755, lng: -101.3554, state: 'Guanajuato' },
  'Celaya': { lat: 20.5236, lng: -100.8161, state: 'Guanajuato' },
  'Guanajuato': { lat: 21.0190, lng: -101.2574, state: 'Guanajuato' },
  'Saltillo': { lat: 25.4232, lng: -100.9963, state: 'Coahuila' },
  'Torreón': { lat: 25.5428, lng: -103.4180, state: 'Coahuila' },
  'Torreon': { lat: 25.5428, lng: -103.4180, state: 'Coahuila' },
  'Hermosillo': { lat: 29.0729, lng: -110.9559, state: 'Sonora' },
  'Ciudad Obregón': { lat: 27.4863, lng: -109.9401, state: 'Sonora' },
  'Aguascalientes': { lat: 21.8818, lng: -102.2916, state: 'Aguascalientes' },
  'Querétaro': { lat: 20.5888, lng: -100.3899, state: 'Querétaro' },
  'Queretaro': { lat: 20.5888, lng: -100.3899, state: 'Querétaro' },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855, state: 'San Luis Potosí' },
  'San Luis Potosi': { lat: 22.1565, lng: -100.9855, state: 'San Luis Potosí' },
  'Toluca': { lat: 19.2826, lng: -99.6557, state: 'Estado de México' },
  'Ecatepec': { lat: 19.6012, lng: -99.0598, state: 'Estado de México' },
  'Nezahualcóyotl': { lat: 19.4013, lng: -99.0149, state: 'Estado de México' },
  'Durango': { lat: 24.0277, lng: -104.6532, state: 'Durango' },
  'Tepic': { lat: 21.5042, lng: -104.8945, state: 'Nayarit' },
  'Tuxtla Gutiérrez': { lat: 16.7521, lng: -93.1151, state: 'Chiapas' },
  'Tuxtla Gutierrez': { lat: 16.7521, lng: -93.1151, state: 'Chiapas' },
  'San Cristóbal de las Casas': { lat: 16.7370, lng: -92.6376, state: 'Chiapas' },
  'Villahermosa': { lat: 17.9869, lng: -92.9303, state: 'Tabasco' },
  'Campeche': { lat: 19.8301, lng: -90.5349, state: 'Campeche' },
  'Chetumal': { lat: 18.5001, lng: -88.2961, state: 'Quintana Roo' },
  'Colima': { lat: 19.2452, lng: -103.7241, state: 'Colima' },
  'Manzanillo': { lat: 19.0515, lng: -104.3149, state: 'Colima' },
  'La Paz': { lat: 24.1426, lng: -110.3128, state: 'Baja California Sur' },
  'Los Cabos': { lat: 22.8905, lng: -109.9167, state: 'Baja California Sur' },
  'Zacatecas': { lat: 22.7709, lng: -102.5832, state: 'Zacatecas' },
  'Cuernavaca': { lat: 18.9242, lng: -99.2216, state: 'Morelos' },
  'Pachuca': { lat: 20.1011, lng: -98.7591, state: 'Hidalgo' },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375, state: 'Tlaxcala' },
  'Tapachula': { lat: 14.9048, lng: -92.2622, state: 'Chiapas' },
  'Matamoros': { lat: 25.8691, lng: -97.5027, state: 'Tamaulipas' },
  'Reynosa': { lat: 26.0921, lng: -98.2766, state: 'Tamaulipas' },
  'Nuevo Laredo': { lat: 27.4760, lng: -99.5161, state: 'Tamaulipas' },
  'Tampico': { lat: 22.2553, lng: -97.8686, state: 'Tamaulipas' },
}
const ESTADOS: Record<string, { lat: number; lng: number }> = {
  'Aguascalientes': { lat: 21.8818, lng: -102.2916 },
  'Baja California': { lat: 30.8406, lng: -115.2838 },
  'Baja California Sur': { lat: 25.0000, lng: -111.3333 },
  'Campeche': { lat: 19.0000, lng: -90.5000 },
  'Chiapas': { lat: 16.7500, lng: -92.6333 },
  'Chihuahua': { lat: 28.6329, lng: -106.0691 },
  'Coahuila': { lat: 27.0000, lng: -102.0000 },
  'Colima': { lat: 19.2452, lng: -103.7241 },
  'Durango': { lat: 24.0277, lng: -104.6532 },
  'Estado de Mexico': { lat: 19.4969, lng: -99.7233 },
  'Guanajuato': { lat: 21.0190, lng: -101.2574 },
  'Guerrero': { lat: 17.4392, lng: -99.5451 },
  'Hidalgo': { lat: 20.1011, lng: -98.7591 },
  'Jalisco': { lat: 20.6597, lng: -103.3496 },
  'Michoacan': { lat: 19.5665, lng: -101.7068 },
  'Morelos': { lat: 18.9242, lng: -99.2216 },
  'Nayarit': { lat: 21.7514, lng: -104.8455 },
  'Nuevo Leon': { lat: 25.5922, lng: -99.9962 },
  'Oaxaca': { lat: 17.0732, lng: -96.7266 },
  'Puebla': { lat: 19.0414, lng: -98.2063 },
  'Queretaro': { lat: 20.5888, lng: -100.3899 },
  'Quintana Roo': { lat: 19.1817, lng: -88.4791 },
  'San Luis Potosi': { lat: 22.1565, lng: -100.9855 },
  'Sinaloa': { lat: 24.8091, lng: -107.3940 },
  'Sonora': { lat: 29.0729, lng: -110.9559 },
  'Tabasco': { lat: 17.9869, lng: -92.9303 },
  'Tamaulipas': { lat: 24.2669, lng: -98.8363 },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375 },
  'Veracruz': { lat: 19.1738, lng: -96.1342 },
  'Yucatan': { lat: 20.9674, lng: -89.5926 },
  'Zacatecas': { lat: 22.7709, lng: -102.5832 },
  'CDMX': { lat: 19.4326, lng: -99.1332 },
}

function detectarCategoria(texto: string): string {
  const lower = texto.toLowerCase()
  for (const [keyword, categoria] of Object.entries(CATEGORIAS)) {
    if (lower.includes(keyword)) return categoria
  }
  return 'civil'
}

function detectarUbicacion(texto: string) {
  for (const [municipio, coords] of Object.entries(MUNICIPIOS)) {
    if (texto.includes(municipio)) {
      return {
        municipality: municipio,
        lat: coords.lat,
        lng: coords.lng,
        state: coords.state,
      }
    }
  }

  for (const [estado, coords] of Object.entries(ESTADOS)) {
    if (texto.includes(estado)) {
      return {
        municipality: null,
        lat: coords.lat,
        lng: coords.lng,
        state: estado,
      }
    }
  }

  return { municipality: null, lat: null, lng: null, state: null }
}

/**
 * LIMPIAR TEXTO
 * -------------
 * Los RSS a veces incluyen etiquetas HTML en el excerpt.
 * Esta función las elimina y decodifica caracteres especiales.
 * Solo guardamos máximo 300 caracteres — regla de copyright.
 */
function limpiarTexto(texto: string): string {
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .trim()
    .slice(0, 300)
}
/**
 * FUNCIÓN: generarSlug
 * --------------------
 * Convierte un nombre en un slug URL-friendly.
 * "Carmen Aristegui" → "carmen-aristegui"
 * "José López" → "jose-lopez"
 *
 * normalize('NFD') descompone los caracteres con tilde en
 * su letra base + el acento por separado.
 * El replace elimina los acentos y deja solo la letra base.
 * Así "é" se convierte en "e" antes de hacer el slug.
 */
function generarSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
/**
 * FUNCIÓN: obtenerOCrearPeriodista
 * ---------------------------------
 * Recibe el nombre del autor del artículo.
 * Si ya existe en la DB → lo devuelve.
 * Si no existe → lo crea con valores iniciales.
 *
 * upsert por slug: si dos artículos tienen el mismo autor,
 * el segundo no crea un duplicado — encuentra el existente.
 *
 * El Índice de Fidelidad empieza en 0 y se recalcula después
 * cuando tengamos suficientes artículos del periodista.
 *
 * mediaId: vinculamos al periodista con el medio donde
 * publicó este artículo. Si publica en varios, se queda
 * con el primero que se registró (update: {} no lo cambia).
 */
async function obtenerOCrearPeriodista(
  nombre: string,
  medioId: string
): Promise<string | null> {
  if (!nombre || nombre.trim().length < 3) return null

  const nombreLimpio = nombre.trim()
  const slug = generarSlug(nombreLimpio)

  if (!slug) return null

  try {
    const periodista = await prisma.journalist.upsert({
      where: { slug },
      update: {},
      create: {
        name: nombreLimpio,
        slug,
        status: 'active',
        fidelity: 0,
        mediaId: medioId,
      },
    })
    return periodista.id
  } catch {
    return null
  }
}

async function scrapeFuente(fuente: typeof FUENTES[0]) {
  const parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      'Accept-Language': 'es-MX,es;q=0.9',
    },
    timeout: 15000,
    customFields: {
      item: [
        ['dc:creator', 'creator'],
        ['author', 'author'],
      ],
    },
  })

  console.log(`\nScrapeando ${fuente.nombre}...`)

  let feed
  try {
    feed = await parser.parseURL(fuente.rss)
  } catch (error: any) {
    console.log(`  ✗ Error: ${error.message}`)
    return { insertados: 0, errores: 1 }
  }

  console.log(`  ${feed.items.length} artículos encontrados`)

  const medio = await prisma.media.upsert({
    where: { slug: fuente.slug },
    update: { name: fuente.nombre },
    create: {
      name: fuente.nombre,
      slug: fuente.slug,
      url: fuente.url,
      rss: fuente.rss,
      verified: true,
    },
  })

  let insertados = 0
  let duplicados = 0

  for (const item of feed.items) {
    if (!item.link || !item.title) continue

    const titulo = limpiarTexto(item.title)
    const excerpt = item.contentSnippet
      ? limpiarTexto(item.contentSnippet)
      : item.summary
      ? limpiarTexto(item.summary)
      : null

    const textoAnalisis = `${titulo} ${excerpt ?? ''}`
    const geo = detectarUbicacion(textoAnalisis)
    const categoria = detectarCategoria(textoAnalisis)

   try {
      /**
       * OBTENER O CREAR PERIODISTA
       * --------------------------
       * Intentamos extraer el autor del RSS.
       * Algunos medios usan dc:creator, otros usan author.
       * Si ninguno está disponible, journalistId queda null.
       */
      const autorNombre = (item as any).creator || item.author || null
      const journalistId = autorNombre
        ? await obtenerOCrearPeriodista(autorNombre, medio.id)
        : null

    await prisma.article.upsert({
  where: { url: item.link },
  update: {  journalistId,
    lat: geo.lat,
    lng: geo.lng,
    municipality: geo.municipality,
    state: geo.state, },
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
          aiAnalyzed: false,
        },
      })
      insertados++
      const autorLog = autorNombre ? ` — ${autorNombre}` : ''
      console.log(`  ✓ ${titulo.slice(0, 60)}${autorLog}`)
    } catch {
      duplicados++
    }
  }

  return { insertados, errores: 0 }
}

async function scrape() {
  console.log('ITZEL — Scraper v3')
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
      data: {
        source: fuente.slug,
        count: resultado.insertados,
        errors: resultado.errores,
      },
    })
  }

  console.log('\n==================')
  console.log(`Total insertados: ${totalInsertados}`)
  console.log(`Fuentes con error: ${totalErrores}`)
  console.log(`Fin: ${new Date().toLocaleString('es-MX')}`)

  await prisma.$disconnect()
}

scrape()