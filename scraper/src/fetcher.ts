/**
 * FETCHER DE ARTÍCULOS COMPLETOS
 * ============================================================
 * Hace fetch del HTML del artículo y extrae el texto del cuerpo
 * para análisis de fidelidad más profundo.
 *
 * NO guardamos el texto completo en la DB — solo lo usamos
 * para calcular el score de fidelidad y luego lo descartamos.
 * Esto respeta copyright y mantiene la DB liviana.
 *
 * Estrategia de extracción:
 * 1. Buscar selectores semánticos estándar (article, main, etc)
 * 2. Buscar clases comunes de contenido periodístico
 * 3. Fallback: extraer todos los párrafos del body
 *
 * Límite: 3000 caracteres máximo para el análisis.
 * Suficiente para detectar patrones sin guardar el artículo.
 * ============================================================
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * SELECTORES DE CONTENIDO
 * -----------------------
 * Lista de selectores CSS ordenados por especificidad.
 * Los medios mexicanos usan distintas clases para su contenido.
 * Probamos en orden hasta encontrar uno con suficiente texto.
 */
const CONTENT_SELECTORS = [
  'article',
  '[class*="article-body"]',
  '[class*="article-content"]',
  '[class*="news-body"]',
  '[class*="nota-body"]',
  '[class*="entry-content"]',
  '[class*="post-content"]',
  '[class*="story-body"]',
  '[class*="content-body"]',
  '[class*="cuerpo"]',
  '[class*="noticia"]',
  'main',
  '.content',
  '#content',
]

/**
 * FUNCIÓN: extraerTextoHTML
 * -------------------------
 * Extrae texto plano de un string HTML.
 * Elimina scripts, estilos y tags HTML.
 * Limpia espacios múltiples.
 */
function extraerTextoHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * FUNCIÓN: extraerContenidoArticulo
 * ----------------------------------
 * Hace fetch del HTML del artículo e intenta extraer
 * el texto del cuerpo usando selectores semánticos.
 *
 * Timeout: 10 segundos — no queremos bloquear el scraper
 * si un artículo tarda demasiado en cargar.
 *
 * Retorna null si el fetch falla o si el contenido
 * extraído es demasiado corto para ser útil.
 */
export async function extraerContenidoArticulo(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const html = await response.text()

    /**
     * EXTRACCIÓN CON REGEX SIMPLE
     * ----------------------------
     * No usamos un parser DOM completo (como cheerio) para
     * evitar dependencias pesadas.
     *
     * En su lugar, buscamos el contenido entre los selectores
     * más comunes usando regex sobre el HTML crudo.
     *
     * Para cada selector intentamos extraer el contenido
     * dentro de ese elemento.
     */
    for (const selector of CONTENT_SELECTORS) {
      /**
       * Convertimos el selector CSS a un regex aproximado.
       * No es perfecto pero funciona para los casos más comunes.
       *
       * [class*="article-body"] → busca class que contenga "article-body"
       * article → busca el tag <article>
       */
      let tagRegex: RegExp | null = null

      if (selector.startsWith('[class*="')) {
        const className = selector.match(/\[class\*="([^"]+)"\]/)?.[1]
        if (className) {
          tagRegex = new RegExp(
            `<[a-z]+[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/[a-z]+>`,
            'i'
          )
        }
      } else if (selector.startsWith('.')) {
        const className = selector.slice(1)
        tagRegex = new RegExp(
          `<[a-z]+[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/[a-z]+>`,
          'i'
        )
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1)
        tagRegex = new RegExp(
          `<[a-z]+[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\/[a-z]+>`,
          'i'
        )
      } else {
        tagRegex = new RegExp(
          `<${selector}[^>]*>([\\s\\S]*?)<\/${selector}>`,
          'i'
        )
      }

      if (!tagRegex) continue

      const match = html.match(tagRegex)
      if (match && match[1]) {
        const texto = extraerTextoHTML(match[1])
        if (texto.length > 200) {
          return texto.slice(0, 3000)
        }
      }
    }

    /**
     * FALLBACK: extraer todos los párrafos
     * Si ningún selector funcionó, extraemos todos los <p>
     * del documento y los concatenamos.
     * Menos preciso pero mejor que nada.
     */
   const parrafos = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? []
const textoParrafos = parrafos
  .map(p => extraerTextoHTML(p))
  .filter(t => t.length > 50)
  // Filtramos párrafos que son claramente navegación del sitio
  // y no contenido periodístico real
  .filter(t => {
    const lower = t.toLowerCase()
    return !lower.includes('anterior') &&
           !lower.includes('siguiente') &&
           !lower.includes('comparte') &&
           !lower.includes('compartir') &&
           !lower.includes('publicidad') &&
           !lower.includes('suscríbete') &&
           !lower.includes('newsletter') &&
           !lower.includes('más leídas') &&
           !lower.includes('relacionadas') &&
           t.split(' ').length > 8
  })
  .join(' ')
  .slice(0, 3000)

    if (textoParrafos.length > 200) return textoParrafos

    return null
  } catch (error: any) {
    console.log(`    [fetcher] Error en ${url.slice(0, 50)}: ${error.message}`)
    return null
  }
}