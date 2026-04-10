'use server'

import { prisma } from '@/lib/prisma'

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
// Mapa de versiones normalizadas a versiones con tilde
// para que PostgreSQL pueda hacer el match correcto
const ESTADO_NORMALIZADO_A_OFICIAL: Record<string, string> = {
  'michoacan': 'Michoacán',
  'nuevo leon': 'Nuevo León',
  'queretaro': 'Querétaro',
  'yucatan': 'Yucatán',
  'jalisco': 'Jalisco',
  'cdmx': 'CDMX',
  'ciudad de mexico': 'Ciudad de México',
  'san luis potosi': 'San Luis Potosí',
  'baja california': 'Baja California',
  'baja california sur': 'Baja California Sur',
  'quintana roo': 'Quintana Roo',
  'estado de mexico': 'Estado de México',
  'guanajuato': 'Guanajuato',
  'chihuahua': 'Chihuahua',
  'coahuila': 'Coahuila',
  'tamaulipas': 'Tamaulipas',
  'veracruz': 'Veracruz',
  'oaxaca': 'Oaxaca',
  'chiapas': 'Chiapas',
  'guerrero': 'Guerrero',
  'puebla': 'Puebla',
  'sonora': 'Sonora',
  'sinaloa': 'Sinaloa',
  'tabasco': 'Tabasco',
  'hidalgo': 'Hidalgo',
  'colima': 'Colima',
  'nayarit': 'Nayarit',
  'durango': 'Durango',
  'zacatecas': 'Zacatecas',
  'aguascalientes': 'Aguascalientes',
  'tlaxcala': 'Tlaxcala',
  'campeche': 'Campeche',
}
/**
 * LOCALIDADES CONOCIDAS
 * ---------------------
 * Lista de estados y municipios principales de México.
 * Si el query coincide con alguno, activamos el modo
 * de búsqueda geográfica en lugar de búsqueda de texto.
 *
 * Modo geográfico: filtra por los campos `state` y
 * `municipality` de la DB — mucho más preciso que buscar
 * la palabra en el título o excerpt del artículo.
 */
const ESTADOS_CONOCIDOS = [
  'aguascalientes', 'baja california', 'baja california sur',
  'campeche', 'chiapas', 'chihuahua', 'coahuila', 'colima',
  'durango', 'estado de mexico', 'guanajuato', 'guerrero',
  'hidalgo', 'jalisco', 'michoacan', 'morelos', 'nayarit',
  'nuevo leon', 'oaxaca', 'puebla', 'queretaro', 'quintana roo',
  'san luis potosi', 'sinaloa', 'sonora', 'tabasco', 'tamaulipas',
  'tlaxcala', 'veracruz', 'yucatan', 'zacatecas', 'cdmx',
  'ciudad de mexico',
]

const MUNICIPIOS_CONOCIDOS = [
  'guadalajara', 'zapopan', 'tlaquepaque', 'tonala',
  'monterrey', 'tijuana', 'merida', 'cancun', 'puebla',
  'veracruz', 'xalapa', 'culiacan', 'mazatlan', 'chihuahua',
  'juarez', 'ciudad juarez', 'oaxaca', 'acapulco', 'morelia',
  'leon', 'saltillo', 'torreon', 'hermosillo', 'mexicali',
  'aguascalientes', 'queretaro', 'san luis potosi', 'toluca',
  'durango', 'tepic', 'tuxtla gutierrez', 'villahermosa',
  'campeche', 'colima', 'la paz', 'zacatecas', 'cuernavaca',
  'pachuca', 'tlaxcala', 'reynosa', 'matamoros', 'tampico',
  'nuevo laredo', 'irapuato', 'celaya', 'uruapan',
]

/**
 * FUNCIÓN: detectarLocalidad
 * --------------------------
 * Determina si el query es una localidad conocida.
 * Devuelve el tipo ('estado' o 'municipio') y el valor
 * normalizado para filtrar en la DB.
 *
 * Retorna null si el query no es una localidad — en ese
 * caso usamos búsqueda de texto normal.
 */
function detectarLocalidad(query: string): { tipo: 'estado' | 'municipio'; valor: string } | null {
  const norm = normalizarTexto(query)
  if (ESTADOS_CONOCIDOS.includes(norm)) return { tipo: 'estado', valor: norm }
  if (MUNICIPIOS_CONOCIDOS.includes(norm)) return { tipo: 'municipio', valor: norm }
  return null
}



type SearchParams = {
  query?: string
  category?: string
  page?: number
  media?: string
}

export async function searchArticles(params: SearchParams) {
  const { query = '', category, page = 1, media } = params
  const ITEMS_PER_PAGE = 20
  const skip = (page - 1) * ITEMS_PER_PAGE
  const queryNorm = normalizarTexto(query)
  const localidad = detectarLocalidad(query)

  let allArticles: any[]
const estadoOficial = ESTADO_NORMALIZADO_A_OFICIAL[queryNorm] ?? query

  if (localidad) {
    const geoWhere: any = {
      AND: [
        category ? { category } : {},
        media ? { media: { slug: media } } : {},
        {
          OR: [
  { state: { contains: estadoOficial, mode: 'insensitive' as const } },
  { municipality: { contains: estadoOficial, mode: 'insensitive' as const } },
  { state: { contains: queryNorm, mode: 'insensitive' as const } },
  { municipality: { contains: queryNorm, mode: 'insensitive' as const } },
],
        },
      ],
    }
    allArticles = await prisma.article.findMany({
      where: geoWhere,
      include: {
        journalist: { select: { name: true, slug: true, fidelity: true } },
        media: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
    })
  } else {
    const where: any = {}
    if (category) where.category = category
    if (media) where.media = { slug: media }

    const raw = await prisma.article.findMany({
      where,
      include: {
        journalist: { select: { name: true, slug: true, fidelity: true } },
        media: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
    })

    allArticles = queryNorm
      ? raw.filter(a =>
          normalizarTexto(a.title).includes(queryNorm) ||
          normalizarTexto(a.excerpt ?? '').includes(queryNorm) ||
          normalizarTexto(a.municipality ?? '').includes(queryNorm) ||
          normalizarTexto(a.state ?? '').includes(queryNorm) ||
          normalizarTexto(a.media.name).includes(queryNorm) ||
          normalizarTexto(a.journalist?.name ?? '').includes(queryNorm)
        )
      : raw
  }

  const mediaCounts: Record<string, { name: string; count: number; slug: string }> = {}
  allArticles.forEach(a => {
    const key = a.media.slug
    if (!mediaCounts[key]) mediaCounts[key] = { name: a.media.name, count: 0, slug: a.media.slug }
    mediaCounts[key].count++
  })

  const mediaList = Object.values(mediaCounts).sort((a, b) => b.count - a.count)
  const total = allArticles.length
  const articles = allArticles.slice(skip, skip + ITEMS_PER_PAGE)

  return {
    articles, total,
    pages: Math.ceil(total / ITEMS_PER_PAGE),
    page, mediaList,
    isGeoSearch: !!localidad,
    geoType: localidad?.tipo ?? null,
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

export async function searchJournalists(query: string) {
  if (!query || query.trim().length < 2) return []
  const queryNorm = normalizarTexto(query)
  const journalists = await prisma.journalist.findMany({
    include: {
      media: { select: { name: true } },
      _count: { select: { articles: true } },
    },
    where: { articles: { some: {} } },
  })
  return journalists.filter(j => {
    return (
      normalizarTexto(j.name).includes(queryNorm) ||
      normalizarTexto(j.media?.name ?? '').includes(queryNorm)
    )
  }).slice(0, 5)
}