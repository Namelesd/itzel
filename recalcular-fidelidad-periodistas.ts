/**
 * RECALCULAR FIDELIDAD DE PERIODISTAS
 * ============================================================
 * Recalcula el campo `fidelity` de cada periodista basándose
 * en el promedio de los fidelityScore de sus artículos.
 * Usa calcularFidelidadPeriodista para agregar el bonus
 * de consistencia si tiene 5+ artículos analizados.
 *
 * Ejecutar con: npx tsx recalcular-fidelidad-periodistas.ts
 * ============================================================
 */

import { prisma } from './src/lib/prisma'
import { calcularFidelidadPeriodista } from './src/lib/fidelity'

async function recalcular() {
  const periodistas = await prisma.journalist.findMany({
    where: {
      // Solo periodistas con al menos un artículo analizado
      articles: { some: { fidelityScore: { not: null } } },
      // Excluimos editoriales — no tienen score individual
      isEditorial: false,
    },
    include: {
      articles: {
        where: { fidelityScore: { not: null } },
        select: { fidelityScore: true },
      },
    },
  })

  console.log(`Periodistas a recalcular: ${periodistas.length}`)
  console.log('Iniciando...\n')

  let actualizados = 0
  let sinCambio = 0

  for (const periodista of periodistas) {
    const scores = periodista.articles
      .map(a => a.fidelityScore!)
      .filter(s => s !== null)

    if (scores.length === 0) continue

    const nuevaFidelidad = calcularFidelidadPeriodista(scores)
    const fidelidadActual = Math.round(periodista.fidelity)

    if (nuevaFidelidad !== fidelidadActual) {
      await prisma.journalist.update({
        where: { id: periodista.id },
        data: { fidelity: nuevaFidelidad },
      })
      console.log(`✓ ${periodista.name.slice(0, 40).padEnd(40)} ${fidelidadActual} → ${nuevaFidelidad} (${scores.length} artículos)`)
      actualizados++
    } else {
      sinCambio++
    }
  }

  console.log('\n══════════════════════════')
  console.log(`Actualizados:  ${actualizados}`)
  console.log(`Sin cambio:    ${sinCambio}`)
  console.log(`Total:         ${periodistas.length}`)

  await prisma.$disconnect()
}

recalcular()