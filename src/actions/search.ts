/**
 * SERVER ACTIONS — search.ts
 * ============================================================
 * Las Server Actions son funciones que se ejecutan en el servidor
 * pero pueden ser llamadas directamente desde componentes React.
 * Es como tener una API, pero sin tener que crear rutas /api/...
 *
 * La directiva 'use server' le dice a Next.js que esta función
 * NUNCA corre en el navegador del usuario — siempre en el servidor.
 * Esto es importante porque aquí accedemos a la base de datos,
 * que nunca debe estar expuesta al cliente.
 * ============================================================
 */
'use server'

import { prisma } from '@/lib/prisma'

/**
 * TIPO: SearchParams
 * ------------------
 * TypeScript nos obliga a definir qué parámetros acepta la función.
 * Con ? marcamos los campos opcionales.
 *
 * El usuario puede buscar solo por query, o agregar filtros extra.
 * Si no pasa un filtro, lo ignoramos en la consulta.
 */
type SearchParams = {
  query?: string
  category?: string
  state?: string
  municipality?: string
  page?: number
}

/**
 * FUNCIÓN: searchArticles
 * -----------------------
 * Recibe los parámetros de búsqueda y devuelve artículos + total.
 * Es async porque espera respuesta de la base de datos.
 *
 * Devolvemos tanto los artículos como el total para poder
 * mostrar "Mostrando 20 de 86 resultados".
 */
export async function searchArticles(params: SearchParams) {
  const {
    query = '',
    category,
    state,
    municipality,
    page = 1,
  } = params

  /**
   * PAGINACIÓN
   * ----------
   * En lugar de traer los 86 artículos de golpe, traemos
   * de 20 en 20. Esto es más rápido y usa menos memoria.
   *
   * page 1 → skip 0, take 20  (artículos 1-20)
   * page 2 → skip 20, take 20 (artículos 21-40)
   * page 3 → skip 40, take 20 (artículos 41-60)
   */
  const ITEMS_PER_PAGE = 20
  const skip = (page - 1) * ITEMS_PER_PAGE  

  /**
   * CONSTRUCCIÓN DEL FILTRO (WHERE CLAUSE)
   * ----------------------------------------
   * Construimos el objeto de filtros dinámicamente.
   * Solo agregamos un filtro si el usuario lo especificó.
   *
   * AND: todos los filtros deben cumplirse al mismo tiempo.
   * contains + mode insensitive: búsqueda sin importar mayúsculas.
   */
const where = {
    AND: [
      query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { excerpt: { contains: query, mode: 'insensitive' as const } },
              { municipality: { contains: query, mode: 'insensitive' as const } },
              { state: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {},
      category ? { category } : {},
      state ? { state: { contains: state, mode: 'insensitive' as const } } : {},
      municipality ? { municipality: { contains: municipality, mode: 'insensitive' as const } } : {},
    ],
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        journalist: true,
        media: true,
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: ITEMS_PER_PAGE,
    }),
    prisma.article.count({ where }),
  ])

  return {
    articles,
    total,
    pages: Math.ceil(total / ITEMS_PER_PAGE),
    page,
  }
}

/**
 * FUNCIÓN: getCategories
 * ----------------------
 * Devuelve todas las categorías únicas que existen en la DB.
 * Usamos esto para mostrar los filtros disponibles.
 *
 * distinct: trae solo valores únicos de 'category'
 * select: solo traemos el campo 'category', no todo el artículo.
 * Esto es mucho más eficiente — imagina traer 86 artículos completos
 * solo para saber qué categorías existen.
 */
export async function getCategories() {
  const categories = await prisma.article.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return categories.map(c => c.category)
}

/**
 * FUNCIÓN: getStates
 * ------------------
 * Devuelve todos los estados con noticias indexadas.
 * Filtramos los null porque algunos artículos no tienen estado detectado.
 */
export async function getStates() {
  const states = await prisma.article.findMany({
    distinct: ['state'],
    select: { state: true },
    where: { state: { not: null } },
    orderBy: { state: 'asc' },
  })
  return states.map(s => s.state).filter(Boolean) as string[]
}