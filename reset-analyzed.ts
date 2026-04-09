import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.article.updateMany({ data: { aiAnalyzed: false } })
  console.log('Reset:', result.count, 'artículos')
  await prisma.$disconnect()
}

main()