import { PrismaClient } from '@prisma/client'
import { calcularFidelidad, calcularFidelidadPeriodista } from './src/lib/fidelity'

const prisma = new PrismaClient()

async function main() {
  console.log('ITZEL — Recalculando Índice de Fidelidad')
  console.log('=========================================')

  const journalists = await prisma.journalist.findMany({
    include: {
      articles: {
        select: { id: true, title: true, excerpt: true },
      },
    },
    where: { articles: { some: {} } },
  })

  console.log(`Periodistas con artículos: ${journalists.length}`)

  let actualizados = 0

  for (const journalist of journalists) {
    const scores: number[] = []

    for (const article of journalist.articles) {
      /**
       * TEXTO MÍNIMO GARANTIZADO
       * ------------------------
       * Si el excerpt es muy corto o null, el algoritmo
       * no tiene suficiente texto para detectar patrones.
       *
       * Solución: si el texto total tiene menos de 80 chars,
       * asignamos un score base de 30 — indica que no hay
       * suficiente información para evaluar, pero tampoco
       * penalizamos al periodista por datos incompletos.
       *
       * Esto es mejor que devolver 0, que implicaría que
       * el artículo tiene mala calidad cuando en realidad
       * simplemente no tenemos suficiente texto para juzgar.
       */
      const textoTotal = article.title + ' ' + (article.excerpt ?? '')

      if (textoTotal.trim().length < 80) {
        scores.push(30)
        continue
      }

      const breakdown = calcularFidelidad(article.title, article.excerpt)
      scores.push(breakdown.total)
    }

    const fidelityFinal = calcularFidelidadPeriodista(scores)

    await prisma.journalist.update({
      where: { id: journalist.id },
      data: { fidelity: fidelityFinal },
    })

    console.log(`  ✓ ${journalist.name}: ${fidelityFinal}% (${scores.length} artículos)`)
    actualizados++
  }

  console.log('\n=========================================')
  console.log(`Actualizados: ${actualizados} periodistas`)
  await prisma.$disconnect()
}

main()