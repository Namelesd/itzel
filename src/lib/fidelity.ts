/**
 * ALGORITMO DE FIDELIDAD v1 — ITZEL
 * ============================================================
 * Calcula el Índice de Fidelidad de un artículo usando solo
 * análisis de texto con regex y patrones lingüísticos.
 * No requiere API externa — corre completamente en el servidor.
 *
 * El score final es 0–100 y representa qué tan confiable es
 * el periodismo de ese artículo basado en 5 dimensiones:
 *
 * 1. Transparencia de fuentes (25 pts)
 * 2. Densidad factual (20 pts)
 * 3. Lenguaje y ambigüedad (20 pts)
 * 4. Validez estructural (15 pts)
 * 5. Diversidad de perspectivas (10 pts)
 *
 * Nota: la dimensión 6 (consistencia histórica, 10 pts)
 * se calcula a nivel periodista, no a nivel artículo.
 * ============================================================
 */

export type FidelityBreakdown = {
  total: number
  transparencia: number
  densidad: number
  lenguaje: number
  estructura: number
  diversidad: number
  signals: string[]
  evidence: Record<string, string[]>
}

/**
 * SEÑALES LINGÜÍSTICAS
 * --------------------
 * Listas de patrones que indican alta o baja fidelidad.
 * Organizadas por dimensión para facilitar el desglose.
 */

const FUENTES_EXPLICITAS = [
  // Fuentes de autoridad formal — ya existentes
  /según\s+(?:el|la|los|las|un|una)?\s*(?:secretar|minister|president|director|doctor|dr\.|lic\.|ing\.|senador|diputado|gobernador|alcalde|vocero|portavoz)/gi,
  /(?:afirmó|declaró|confirmó|informó|señaló|explicó|detalló|precisó|aseguró|sostuvo)\s+\w+/gi,
  /(?:en\s+un\s+)?(?:comunicado|boletín|informe|reporte|documento|dictamen|resolución)/gi,
  /(?:datos|cifras|estadísticas)\s+(?:del?|de\s+la|oficiales?\s+de)/gi,

  // Fuentes de sociedad civil y actores colectivos
  // Detecta "manifestantes señalaron", "conductores denunciaron", etc.
  /(?:manifestantes?|protestantes?|conductores?|choferes?|trabajadores?|vecinos?|habitantes?|comerciantes?|estudiantes?|médicos?|enfermeros?|maestros?|docentes?)\s+(?:señalaron|denunciaron|exigieron|afirmaron|declararon|indicaron|explicaron|protestaron|demandaron)/gi,

  // Organizaciones civiles y colectivos
  /(?:organización|colectivo|asociación|sindicato|gremio|cámara|federación|unión\s+de)\s+[A-ZÁÉÍÓÚÑ]/gi,

  // Testimonios directos
  /(?:testigos?|víctimas?|afectados?|familiares?)\s+(?:del?|de\s+la)?\s*(?:caso|incidente|hecho|suceso|ataque|accidente)/gi,

  // Fuentes institucionales ampliadas
  /(?:según|de\s+acuerdo\s+con)\s+(?:el|la|los|las)?\s*(?:IMSS|ISSSTE|INEGI|SAT|UNAM|IPN|CFE|Pemex|Banxico|CNDH|INE|CONACYT|SEP|SSA|SEDENA|SEMAR)/gi,
]

const CITAS_TEXTUALES = [
  /"[^"]{20,}"/g,
  /«[^»]{20,}»/g,
]

const LENGUAJE_AMBIGUO = [
  /\b(?:se\s+dice\s+que|se\s+rumorea|al\s+parecer|presuntamente|supuestamente)\b/gi,
  /\b(?:fuentes\s+(?:cercanas|allegadas|que\s+pidieron|anónimas|confiables))\b/gi,
  /\b(?:podría|habría|tendría|estaría|sería)\s+(?:ser|estar|haber|tener)/gi,
  /\b(?:trascendió\s+que|se\s+supo\s+que|extraoficialmente)\b/gi,
]

const ADJETIVOS_CARGADOS = [
  /\b(?:nefasto|corrupto|deleznable|infame|traidor|criminal|maldito|terrible|desastroso|catastrófico)\b/gi,
  /\b(?:glorioso|magnífico|extraordinario|brillante|excepcional|heroico|impecable)\b/gi,
  /\b(?:populacho|chusma|ignorante|fanático|radical|extremista)\b/gi,
  // Lenguaje de parcialidad positiva hacia figuras políticas
  // común en periodismo de tendencia oficialista
  /\b(?:destacó\s+los?\s+logros?|exitosa?\s+gestión|gran\s+avance|histórico\s+logro|transformación\s+exitosa|resultados?\s+positivos?\s+de|beneficios?\s+que\s+trajo|legado\s+positivo)\b/gi,
]

const MARCADORES_CONTEXTO = [
  /\b(?:antecedentes?|contexto|historial|previamente|anteriormente|en\s+(?:días|semanas|meses)\s+(?:pasados|anteriores))\b/gi,
  /\b(?:de\s+acuerdo\s+con|con\s+base\s+en|de\s+conformidad\s+con)\b/gi,
]

const MARCADORES_CONTRASTE = [
  /\b(?:sin\s+embargo|no\s+obstante|por\s+(?:el\s+)?(?:otro|su)\s+lado|en\s+contraste|por\s+su\s+parte|mientras\s+que)\b/gi,
  /\b(?:negó|rechazó|desmintió|refutó|contradijo)\b/gi,
  /\b(?:versión\s+(?:contraria|diferente|distinta)|perspectiva\s+(?:contraria|diferente))\b/gi,
]
// Detectores de las preguntas básicas del periodismo
const DETECTOR_QUIEN = /(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s){1,3}(?:afirmó|declaró|confirmó|informó|señaló|dijo|explicó|aseguró)|(?:el|la|los|las)\s+(?:secretar|minister|president|director|gobernador|alcalde|diputado|senador)/gi

const DETECTOR_CUANDO = /\b(?:este\s+(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)|ayer|hoy|mañana|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?|\d{4})\b/gi

const DETECTOR_DONDE = /\b(?:en\s+(?:la\s+ciudad\s+de|el\s+estado\s+de|el\s+municipio\s+de)?)\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/gi

const DETECTOR_QUE = /\b(?:para|con\s+el\s+fin\s+de|con\s+el\s+objetivo\s+de|a\s+causa\s+de|debido\s+a|como\s+resultado\s+de|tras|después\s+de|luego\s+de)\b/gi
/**
 * FUNCIÓN AUXILIAR: contarCoincidencias
 * --------------------------------------
 * Cuenta cuántas veces aparece un patrón en el texto.
 * Reseteamos lastIndex antes de cada uso porque los regex
 * con flag 'g' mantienen estado entre llamadas.
 */
function contar(texto: string, patrones: RegExp[]): number {
  return patrones.reduce((total, regex) => {
    regex.lastIndex = 0
    const matches = texto.match(regex)
    return total + (matches ? matches.length : 0)
  }, 0)
}

/**
 * TIPO: FidelityBreakdown
 * -----------------------
 * Ahora incluye `evidence` — un diccionario donde cada señal
 * tiene una lista de los textos exactos que la activaron.
 *
 * Ejemplo:
 * evidence: {
 *   "Múltiples fuentes nombradas": ["confirmó el secretario", "según el IMSS"],
 *   "Incluye fechas": ["12 de abril", "en 2025"],
 * }
 */


/**
 * FUNCIÓN AUXILIAR: extraerEvidencia
 * -----------------------------------
 * Extrae los textos que activaron un patrón en el texto.
 * Devuelve máximo 3 ejemplos para no saturar la UI.
 * Los limita a 60 caracteres para que quepan en el tooltip.
 */
function extraerEvidencia(texto: string, patrones: RegExp[]): string[] {
  const encontrados: string[] = []
  for (const regex of patrones) {
    regex.lastIndex = 0
    const matches = texto.matchAll(new RegExp(regex.source, 'gi'))
    for (const match of matches) {
      const texto = match[0].trim().slice(0, 60)
      if (texto.length > 3 && !encontrados.includes(texto)) {
        encontrados.push(texto)
        if (encontrados.length >= 3) break
      }
    }
    if (encontrados.length >= 3) break
  }
  return encontrados
}

export function calcularFidelidad(
  titulo: string,
  excerpt: string | null
): FidelityBreakdown {
  const texto = (titulo + ' ' + (excerpt ?? '')).toLowerCase()
  const textoOriginal = titulo + ' ' + (excerpt ?? '')
  const signals: string[] = []
  const evidence: Record<string, string[]> = {}

  // ── DIMENSIÓN 1: TRANSPARENCIA ──────────────────────────────
  let transparencia = 0

  const fuentesExplicitas = contar(textoOriginal, FUENTES_EXPLICITAS)
  const citasTextuales = contar(textoOriginal, CITAS_TEXTUALES)

  if (fuentesExplicitas >= 2) {
    transparencia += 15
    signals.push('Múltiples fuentes nombradas')
    evidence['Múltiples fuentes nombradas'] = extraerEvidencia(textoOriginal, FUENTES_EXPLICITAS)
  } else if (fuentesExplicitas === 1) {
    transparencia += 8
    signals.push('Una fuente nombrada')
    evidence['Una fuente nombrada'] = extraerEvidencia(textoOriginal, FUENTES_EXPLICITAS)
  } else {
    signals.push('Sin fuentes explícitas')
    evidence['Sin fuentes explícitas'] = []
  }

  if (citasTextuales >= 1) {
    transparencia += 10
    signals.push('Incluye citas textuales')
    evidence['Incluye citas textuales'] = extraerEvidencia(textoOriginal, CITAS_TEXTUALES)
  }

  transparencia = Math.min(transparencia, 25)

  // ── DIMENSIÓN 2: DENSIDAD FACTUAL ───────────────────────────
  let densidad = 0

  const regexFechas = /\b\d{1,2}\s+de\s+\w+|\b\d{4}\b|\bayer\b|\bhoy\b|\besta\s+semana\b/gi
  const regexCifras = /\b\d+(?:\.\d+)?(?:\s*(?:millones?|miles?|pesos?|%|por\s*ciento|km|metros?))\b/gi
// Detecta nombres propios de personas e instituciones
// pero excluye inicios de oración y palabras genéricas
// Requiere al menos 3 palabras en mayúscula seguidas
// o 2 palabras donde la segunda sea un apellido típico
const regexNombres = /(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\s){2,}(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?/g
  const tieneFechas = regexFechas.test(textoOriginal)
  const tieneCifras = regexCifras.test(textoOriginal)
  const tieneNombres = regexNombres.test(textoOriginal)
  // Verificamos que los nombres encontrados no sean solo
// el nombre del medio o palabras genéricas del título
const nombresEncontrados = textoOriginal.match(regexNombres) ?? []
const nombresFiltrados = nombresEncontrados.filter(n => {
  const lower = n.toLowerCase().trim()
  // Excluimos frases genéricas que no son nombres propios
  const genericas = ['el presidente', 'la secretaria', 'el gobernador', 'la alcaldesa', 'el director', 'la directora', 'el senador', 'la senadora', 'el diputado', 'la diputada']
  return !genericas.some(g => lower.startsWith(g))
})
const tieneNombresReales = nombresFiltrados.length > 0
  const adjetivosCargados = contar(textoOriginal, ADJETIVOS_CARGADOS)

  if (tieneFechas) {
    densidad += 5
    signals.push('Incluye fechas')
    evidence['Incluye fechas'] = extraerEvidencia(textoOriginal, [/\b\d{1,2}\s+de\s+\w+|\b\d{4}\b|\bayer\b|\bhoy\b/gi])
  }
  if (tieneCifras) {
    densidad += 8
    signals.push('Incluye datos numéricos')
    evidence['Incluye datos numéricos'] = extraerEvidencia(textoOriginal, [/\b\d+(?:\.\d+)?(?:\s*(?:millones?|miles?|pesos?|%|por\s*ciento|km|metros?))\b/gi])
  }
  if (tieneNombresReales) {
    densidad += 7
    signals.push('Menciona personas o instituciones')
    evidence['Menciona personas o instituciones'] = nombresFiltrados.slice(0, 3).map(n => n.trim())

  }
  // Contamos por separado negativos y positivos para dar
// feedback más preciso al usuario sobre el tipo de parcialidad
const ADJETIVOS_NEGATIVOS = [ADJETIVOS_CARGADOS[0], ADJETIVOS_CARGADOS[1], ADJETIVOS_CARGADOS[2]]
const ADJETIVOS_POSITIVOS_PARCIALES = [ADJETIVOS_CARGADOS[3]]

const negativos = contar(textoOriginal, ADJETIVOS_NEGATIVOS)
const positivosParciales = contar(textoOriginal, ADJETIVOS_POSITIVOS_PARCIALES)

if (negativos > 2) {
  densidad -= 5
  signals.push('Lenguaje emocionalmente cargado')
  evidence['Lenguaje emocionalmente cargado'] = extraerEvidencia(textoOriginal, ADJETIVOS_NEGATIVOS)
}

if (positivosParciales >= 1) {
  densidad -= 4
  signals.push('Lenguaje favorable sin contraste')
  evidence['Lenguaje favorable sin contraste'] = extraerEvidencia(textoOriginal, ADJETIVOS_POSITIVOS_PARCIALES)
}

  densidad = Math.max(0, Math.min(densidad, 20))

  // ── DIMENSIÓN 3: LENGUAJE Y AMBIGÜEDAD ──────────────────────
  let lenguaje = 20

  const ambiguedad = contar(texto, LENGUAJE_AMBIGUO)
  if (ambiguedad >= 3) {
    lenguaje -= 15
    signals.push('Alto uso de lenguaje ambiguo')
    evidence['Alto uso de lenguaje ambiguo'] = extraerEvidencia(textoOriginal, LENGUAJE_AMBIGUO)
  } else if (ambiguedad === 2) {
    lenguaje -= 8
    signals.push('Lenguaje ambiguo moderado')
    evidence['Lenguaje ambiguo moderado'] = extraerEvidencia(textoOriginal, LENGUAJE_AMBIGUO)
  } else if (ambiguedad === 1) {
    lenguaje -= 3
    signals.push('Algo de lenguaje ambiguo')
    evidence['Algo de lenguaje ambiguo'] = extraerEvidencia(textoOriginal, LENGUAJE_AMBIGUO)
  } else {
    signals.push('Lenguaje preciso')
    evidence['Lenguaje preciso'] = []
  }

  lenguaje = Math.max(0, lenguaje)

  // ── DIMENSIÓN 4: VALIDEZ ESTRUCTURAL ────────────────────────
  let estructura = 0

  const longitudTexto = textoOriginal.length
  const tieneContexto = contar(texto, MARCADORES_CONTEXTO) > 0

  if (longitudTexto > 400) {
  estructura += 5
  signals.push('Artículo con desarrollo suficiente')
  // Extraemos un fragmento real del inicio del artículo
  // para mostrar en el hover como evidencia del desarrollo
  evidence['Artículo con desarrollo suficiente'] = [
    textoOriginal.slice(0, 120).trim() + '...'
  ]
} else if (longitudTexto > 150) {
  estructura += 2
} else {
  signals.push('Artículo muy breve')
  // Si es muy breve mostramos todo el texto disponible
  evidence['Artículo muy breve'] = [
    textoOriginal.trim()
  ]
}

if (tieneContexto) {
  estructura += 10
  signals.push('Incluye contexto o antecedentes')
  evidence['Incluye contexto o antecedentes'] = extraerEvidencia(textoOriginal, MARCADORES_CONTEXTO)
}
// Detectamos cuántas preguntas básicas responde el artículo
// Cada una suma 1 punto adicional a estructura (máx 4 extra)
const tieneQuien = DETECTOR_QUIEN.test(textoOriginal)
const tieneCuando = DETECTOR_CUANDO.test(textoOriginal)
const tieneDonde = DETECTOR_DONDE.test(textoOriginal)
const tieneQue = DETECTOR_QUE.test(textoOriginal)

const preguntasRespondidas = [tieneQuien, tieneCuando, tieneDonde, tieneQue].filter(Boolean).length

if (preguntasRespondidas >= 3) {
  estructura += 4
  signals.push('Responde preguntas básicas del periodismo')
  evidence['Responde preguntas básicas del periodismo'] = [
    tieneQuien ? '✓ Quién' : '✗ Quién',
    tieneCuando ? '✓ Cuándo' : '✗ Cuándo',
    tieneDonde ? '✓ Dónde' : '✗ Dónde',
    tieneQue ? '✓ Qué/Por qué' : '✗ Qué/Por qué',
  ]
} else if (preguntasRespondidas === 2) {
  estructura += 2
  signals.push('Responde algunas preguntas básicas')
  evidence['Responde algunas preguntas básicas'] = [
    tieneQuien ? '✓ Quién' : '✗ Quién',
    tieneCuando ? '✓ Cuándo' : '✗ Cuándo',
    tieneDonde ? '✓ Dónde' : '✗ Dónde',
    tieneQue ? '✓ Qué/Por qué' : '✗ Qué/Por qué',
  ]
}
  estructura = Math.min(estructura, 15)

  // ── DIMENSIÓN 5: DIVERSIDAD DE PERSPECTIVAS ─────────────────
  let diversidad = 0

  const tieneContraste = contar(textoOriginal, MARCADORES_CONTRASTE)



if (tieneContraste >= 2) {
  diversidad = 10
  signals.push('Contrasta múltiples perspectivas')
  evidence['Contrasta múltiples perspectivas'] = extraerEvidencia(textoOriginal, MARCADORES_CONTRASTE)
} else if (tieneContraste === 1) {
  diversidad = 7
  signals.push('Menciona perspectiva alternativa')
  evidence['Menciona perspectiva alternativa'] = extraerEvidencia(textoOriginal, MARCADORES_CONTRASTE)
} else {
  // Base de 5 porque ausencia de contraste no necesariamente
  // indica mala práctica — algunos géneros periodísticos no
  // requieren dos versiones. Pero sí penalizamos ligeramente
  // porque el contraste es un indicador de verificabilidad.
  diversidad = 5
  signals.push('Sin perspectivas contrastantes')
  evidence['Sin perspectivas contrastantes'] = []
}

  const total = Math.round(transparencia + densidad + lenguaje + estructura + diversidad)

  return { total, transparencia, densidad, lenguaje, estructura, diversidad, signals, evidence }
}

/**
 * FUNCIÓN: calcularFidelidadPeriodista
 * -------------------------------------
 * Promedia el score de todos los artículos del periodista.
 * Agrega el bonus de consistencia histórica si tiene
 * suficientes artículos para calcularla (mínimo 5).
 *
 * El bonus de consistencia sube si el score es estable
 * (desviación estándar baja) a lo largo del tiempo.
 */
export function calcularFidelidadPeriodista(
  scores: number[]
): number {
  if (scores.length === 0) return 0

  const promedio = scores.reduce((a, b) => a + b, 0) / scores.length

  let bonusConsistencia = 0
  if (scores.length >= 5) {
    const varianza = scores.reduce((acc, s) => acc + Math.pow(s - promedio, 2), 0) / scores.length
    const desviacion = Math.sqrt(varianza)

    /**
     * Desviación baja = periodista consistente = bonus alto
     * Desviación < 10 → bonus máximo de 10 pts
     * Desviación > 25 → sin bonus
     */
    if (desviacion < 10) bonusConsistencia = 10
    else if (desviacion < 15) bonusConsistencia = 7
    else if (desviacion < 20) bonusConsistencia = 4
    else if (desviacion < 25) bonusConsistencia = 1
    else bonusConsistencia = 0
  }

  return Math.min(Math.round(promedio + bonusConsistencia), 100)
}