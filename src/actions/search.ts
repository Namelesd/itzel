'use server'

import { prisma } from '@/lib/prisma'

type SearchParams = {
  query?: string
  category?: string
  state?: string
  municipality?: string
  page?: number
}

/**
 * FUNCIÓN: normalizarTexto
 * ------------------------
 * Elimina tildes para que "Mexico" encuentre "México".
 * normalize('NFD') descompone caracteres acentuados en
 * letra base + acento por separado.
 * El replace elimina los acentos dejando solo la letra base.
 */
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export async function searchArticles(params: SearchParams) {
  const { query = '', category, state, municipality, page = 1 } = params
  const ITEMS_PER_PAGE = 20
  const skip = (page - 1) * ITEMS_PER_PAGE

  /**
   * BÚSQUEDA SIN TILDES
   * -------------------
   * Prisma no soporta búsqueda sin tildes nativamente.
   * Solución: si hay query, traemos todos los artículos
   * que hacen match aproximado y luego filtramos en memoria.
   *
   * Para producción con muchos artículos, esto se reemplaza
   * por la extensión unaccent de PostgreSQL o un índice full-text.
   * Por ahora funciona bien con < 10,000 artículos.
   */
  const queryNormalizado = normalizarTexto(query)

  const where: any = {}
  if (category) where.category = category
  if (state) where.state = { contains: state, mode: 'insensitive' }
  if (municipality) where.municipality = { contains: municipality, mode: 'insensitive' }

  const allArticles = await prisma.article.findMany({
    where,
    include: {
      journalist: {
        select: { name: true, slug: true, fidelity: true },
      },
      media: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
  })

  /**
   * FILTRADO EN MEMORIA SIN TILDES
   * --------------------------------
   * Si hay query, filtramos los artículos normalizando tanto
   * el texto del artículo como el query del usuario.
   * Así "Mexico" encuentra "México" y "politica" encuentra "Política".
   */
  const filtered = queryNormalizado
    ? allArticles.filter(a => {
        const titleNorm = normalizarTexto(a.title)
        const excerptNorm = normalizarTexto(a.excerpt ?? '')
        const municipioNorm = normalizarTexto(a.municipality ?? '')
        const stateNorm = normalizarTexto(a.state ?? '')
        const mediaNorm = normalizarTexto(a.media.name)
        const journalistNorm = normalizarTexto(a.journalist?.name ?? '')

        return (
          titleNorm.includes(queryNormalizado) ||
          excerptNorm.includes(queryNormalizado) ||
          municipioNorm.includes(queryNormalizado) ||
          stateNorm.includes(queryNormalizado) ||
          mediaNorm.includes(queryNormalizado) ||
          journalistNorm.includes(queryNormalizado)
        )
      })
    : allArticles

  const total = filtered.length
  const articles = filtered.slice(skip, skip + ITEMS_PER_PAGE)

  return {
    articles,
    total,
    pages: Math.ceil(total / ITEMS_PER_PAGE),
    page,
  }
}

export async function getCategories(): Promise<string[]> {
  const results = await prisma.article.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return results.map(r => r.category)
}

export async function getStates(): Promise<string[]> {
  const results = await prisma.article.findMany({
    distinct: ['state'],
    select: { state: true },
    where: { state: { not: null } },
    orderBy: { state: 'asc' },
  })
  return results.map(r => r.state).filter(Boolean) as string[]
}