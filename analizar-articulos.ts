/**
 * SCRIPT: analizar-articulos.ts
 * ============================================================
 * Recorre los artículos existentes en la DB que no han sido
 * analizados (aiAnalyzed: false) y hace fetch de su contenido
 * completo para calcular el score de fidelidad con más texto.
 *
 * POR QUÉ UN SCRIPT SEPARADO DEL SCRAPER:
 * El scraper corre rápido — su trabajo es indexar URLs.
 * Este script es más lento — hace fetch de cada artículo
 * individualmente. Separarlos permite correr cada uno
 * en el momento adecuado sin bloquear al otro.
 *
 * ESTRATEGIA DE PROCESAMIENTO:
 * - Procesa en lotes de 10 artículos
 * - Espera 500ms entre artículos para no saturar servidores
 * - Espera 2s entre lotes
 * - Si el fetch falla, usa el excerpt del RSS como fallback
 * - Siempre marca aiAnalyzed: true al final para no reintentar
 *
 * SOBRE EL SCORE DE 30 EN FALLBACK:
 * Si no pudimos obtener el artículo completo Y el excerpt
 * es demasiado corto, asignamos 30 puntos base.
 * Esto indica "sin datos suficientes" sin penalizar al
 * periodista injustamente por artículos inaccesibles.
 *
 * CÓMO CORRER:
 * npx tsx analizar-articulos.ts
 * o con el script de package.json: npm run analyze
 * ============================================================
 */

import { PrismaClient } from '@prisma/client'
import { calcularFidelidad } from './src/lib/fidelity'
import { extraerContenidoArticulo } from './scraper/src/fetcher'

const prisma = new PrismaClient()

/**
 * TAMAÑO DEL LOTE
 * ---------------
 * 10 artículos por lote es un balance entre velocidad
 * y no saturar los servidores de los medios.
 * Aumentar este número puede causar bloqueos por rate limiting.
 */
const BATCH_SIZE = 10

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('ITZEL — Análisis de artículos completos')
  console.log('========================================')

  /**
   * CONTEO INICIAL
   * --------------
   * Contamos cuántos artículos necesitan análisis antes
   * de empezar para mostrar el progreso al usuario.
   */
  const total = await prisma.article.count({ where: { aiAnalyzed: false } })
  console.log(`Artículos pendientes: ${total}`)

  if (total === 0) {
    console.log('Todos los artículos ya fueron analizados.')
    await prisma.$disconnect()
    return
  }

  let procesados = 0
  let exitosos = 0
  let fallidos = 0
  let offset = 0

  while (offset < total) {
    /**
     * FETCH POR LOTES
     * ---------------
     * En lugar de cargar todos los artículos en memoria,
     * traemos solo BATCH_SIZE a la vez.
     * Esto mantiene el uso de memoria bajo sin importar
     * cuántos artículos haya en la DB.
     */
    const articulos = await prisma.article.findMany({
      where: { aiAnalyzed: false },
      select: {
        id: true,
        title: true,
        url: true,
        excerpt: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    })

    if (articulos.length === 0) break

    const loteNum = Math.floor(offset / BATCH_SIZE) + 1
    const totalLotes = Math.ceil(total / BATCH_SIZE)
    console.log(`\nLote ${loteNum}/${totalLotes} — artículos ${offset + 1} a ${offset + articulos.length}`)

    for (const articulo of articulos) {
      process.stdout.write(`  ${articulo.title.slice(0, 55)}... `)

      /**
       * INTENTO DE FETCH DEL ARTÍCULO COMPLETO
       * ----------------------------------------
       * extraerContenidoArticulo hace fetch del HTML,
       * extrae el texto del cuerpo del artículo y
       * devuelve máximo 3000 caracteres.
       *
       * Retorna null si:
       * - El servidor no responde en 10 segundos
       * - El servidor devuelve error 4xx o 5xx
       * - No encuentra contenido suficiente en el HTML
       * - El artículo está detrás de paywall
       */
      const contenido = await extraerContenidoArticulo(articulo.url)

      if (contenido && contenido.length > 200) {
        /**
         * ANÁLISIS CON TEXTO COMPLETO
         * ----------------------------
         * Tenemos suficiente texto para un análisis rico.
         * calcularFidelidad devuelve:
         * - total: score 0-90
         * - signals: array de señales detectadas
         * - evidence: textos exactos que activaron cada señal
         *
         * Guardamos signals + evidence juntos en aiSignals
         * para que la UI pueda mostrar la justificación
         * completa del score.
         */
        const fidelity = calcularFidelidad(articulo.title, contenido)

        await prisma.article.update({
          where: { id: articulo.id },
          data: {
            fidelityScore: fidelity.total,
            aiAnalyzed: true,
            /**
             * JSON.parse(JSON.stringify()) convierte el objeto
             * TypeScript a un objeto JSON puro que Prisma
             * puede guardar en el campo de tipo Json.
             *
             * Sin esta conversión Prisma lanza error de tipo.
             */
            aiSignals: JSON.parse(JSON.stringify({
              signals: fidelity.signals,
              evidence: fidelity.evidence,
            })),
          },
        })

        console.log(`✓ score: ${fidelity.total} (${contenido.length} chars)`)
        exitosos++
      } else {
        /**
         * FALLBACK: ANÁLISIS CON EXCERPT DEL RSS
         * ----------------------------------------
         * El fetch falló o devolvió muy poco texto.
         * Posibles razones:
         * - Artículo detrás de paywall (Reforma, El Norte)
         * - Servidor bloqueó el request (429 rate limit)
         * - Artículo fue eliminado (404)
         * - Timeout por servidor lento
         *
         * Usamos el excerpt del RSS como fallback.
         * Si tampoco hay excerpt, usamos score base de 30.
         */
        const textoBase = articulo.title + ' ' + (articulo.excerpt ?? '')
        const fidelity = textoBase.trim().length > 80
          ? calcularFidelidad(articulo.title, articulo.excerpt)
          : null

        await prisma.article.update({
          where: { id: articulo.id },
          data: {
            fidelityScore: fidelity?.total ?? 30,
            aiAnalyzed: true,
            aiSignals: fidelity
              ? JSON.parse(JSON.stringify({
                  signals: fidelity.signals,
                  evidence: fidelity.evidence,
                }))
              : null,
          },
        })

        console.log(`✗ fallback excerpt (score: ${fidelity?.total ?? 30})`)
        fallidos++
      }

      procesados++

      /**
       * DELAY ENTRE ARTÍCULOS
       * ----------------------
       * 500ms entre cada request para no saturar los
       * servidores y reducir la probabilidad de bloqueo.
       */
      await delay(500)
    }

    offset += BATCH_SIZE

    /**
     * DELAY ENTRE LOTES
     * -----------------
     * 2 segundos entre lotes — pausa más larga para
     * que los servidores no detecten un patrón de scraping.
     */
    await delay(2000)

    /**
     * PROGRESO EN TIEMPO REAL
     * -----------------------
     * Mostramos el progreso después de cada lote para
     * que el usuario sepa que el script sigue corriendo.
     */
    const pct = Math.round((procesados / total) * 100)
    console.log(`  Progreso: ${procesados}/${total} (${pct}%)`)
  }

  console.log('\n========================================')
  console.log(`Total procesados: ${procesados}`)
  console.log(`Con contenido completo: ${exitosos} (${Math.round((exitosos / procesados) * 100)}%)`)
  console.log(`Solo excerpt (fallback): ${fallidos} (${Math.round((fallidos / procesados) * 100)}%)`)
  console.log('\nAhora corre: npm run fidelity')
  console.log('Para recalcular el score de los periodistas.')

  await prisma.$disconnect()
}

main()