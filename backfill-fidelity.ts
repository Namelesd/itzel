/**
 * BACKFILL DE FIDELIDAD
 * ============================================================
 * Re-analiza todos los artículos que no tienen fidelityScore
 * guardado en la DB. Hace fetch del contenido completo de cada
 * uno, calcula el score con el mismo algoritmo del scraper,
 * y actualiza el registro.
 *
 * Usa el mismo flujo que el scraper para garantizar consistencia:
 * extraerContenidoArticulo → calcularFidelidad → upsert
 *
 * Ejecutar con:
 *   npx tsx backfill-fidelity.ts
 *
 * Recomendado correrlo una sola vez después de este deploy.
 * Para re-correrlo, cambiar el WHERE a: aiAnalyzed: false
 * ============================================================
 */

import { prisma } from './src/lib/prisma'
import { extraerContenidoArticulo } from './scraper/src/fetcher'
import { calcularFidelidad } from './src/lib/fidelity'

// Espera entre artículos para no saturar los servidores de origen
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
function limpiarEncoding(texto: string): string {
  return texto
    .replace(/\uFFFD/g, '')
    .replace(/\ufffd/g, '')
    .replace(/[^\u0000-\u024F\u1E00-\u1EFF\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
async function backfill() {
  // Traemos solo los artículos sin score. Si quieres re-analizar
  // todos (incluyendo los ya analizados), quita el filtro fidelityScore.
  const articulos = await prisma.article.findMany({
    where: {fidelityScore: null },
    select: { id: true, url: true, title: true, excerpt: true },
    orderBy: { publishedAt: 'desc' },
  })

  console.log(`Artículos sin score: ${articulos.length}`)
  console.log('Iniciando backfill...\n')

  let actualizados = 0
  let sinContenido = 0
  let errores = 0

  for (const [i, art] of articulos.entries()) {
    console.log(`[${i + 1}/${articulos.length}] ${art.title.slice(0, 60)}`)

    try {
      const contenido = await extraerContenidoArticulo(art.url)

      if (!contenido || contenido.length < 80) {
        // No hay contenido suficiente — dejamos el artículo como pendiente.
        // NO calculamos desde excerpt para mantener consistencia del índice.
        console.log('  → sin contenido suficiente, marcado como pendiente\n')
        sinContenido++
        await delay(500)
        continue
      }

      const resultado = calcularFidelidad(art.title, contenido)
      const tituloLimpio = limpiarEncoding(art.title)
      const excerptLimpio = art.excerpt ? limpiarEncoding(art.excerpt) : null
      const aiSignals = JSON.parse(JSON.stringify(resultado.signals))

     await prisma.article.update({
  where: { id: art.id },
  data: {
    title: tituloLimpio,
    excerpt: excerptLimpio,
    fidelityScore: resultado.total,
    aiAnalyzed: true,
    aiSignals,
    content: contenido.slice(0, 5000),
  },
})
await prisma.article.update({
  where: { id: art.id },
  data: {
    title: limpiarEncoding(art.title),
    excerpt: art.excerpt ? limpiarEncoding(art.excerpt) : null,
  },
})
      console.log(`  → score: ${resultado.total}/90 ✓\n`)
      actualizados++
      console.log(`  → score: ${resultado.total}/90 ✓ | título: ${tituloLimpio.slice(0, 50)}\n`)

      // Delay entre requests para respetar los servidores de origen
      await delay(800)

    } catch (err: any) {
      console.log(`  → error: ${err.message}\n`)
      errores++
      await delay(500)
    }
  }

  console.log('══════════════════════════')
  console.log(`Actualizados:    ${actualizados}`)
  console.log(`Sin contenido:   ${sinContenido}`)
  console.log(`Errores:         ${errores}`)

  await prisma.$disconnect()
}
// Al terminar el backfill, recalculamos fidelidad de periodistas
const { execSync } = await import('child_process')
execSync('npx tsx recalcular-fidelidad-periodistas.ts', { stdio: 'inherit' })
backfill()