import { prisma } from './src/lib/prisma'

async function check() {
  const total = await prisma.article.count()
  const conEstado = await prisma.article.count({ where: { state: { not: null } } })
  const sinEstado = await prisma.article.count({ where: { state: null } })
  const estadoVacio = await prisma.article.count({ where: { state: '' } })

  console.log(`Total:          ${total}`)
  console.log(`Con estado:     ${conEstado}`)
  console.log(`Sin estado:     ${sinEstado}`)
  console.log(`Estado vacío:   ${estadoVacio}`)
  console.log(`Suma:           ${conEstado + sinEstado}`)

  await prisma.$disconnect()
}

check()