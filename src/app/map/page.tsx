    /**
 * PÁGINA: /map
 * ============================================================
 * Server Component que trae los artículos con coordenadas
 * y los pasa al Client Component NewsMap.
 *
 * Por qué separamos Server y Client:
 * - El Server Component accede a Prisma (base de datos)
 * - El Client Component accede a Mapbox (navegador)
 * - No pueden mezclarse en el mismo archivo
 *
 * where: { lat: { not: null } } — solo artículos con
 * coordenadas detectadas. Los que no tienen municipio
 * identificado no aparecen en el mapa.
 * ============================================================
 */

import { prisma } from '@/lib/prisma'
import NewsMap from '@/components/NewsMap'

export default async function MapPage() {
  /**
   * Traemos solo los artículos que tienen coordenadas.
   * select: traemos únicamente los campos que necesita el mapa
   * para no mandar datos innecesarios al cliente.
   *
   * take: 500 — límite de pins para que el mapa no se vuelva lento.
   * En Fase 2 implementaremos clustering para manejar miles de pins.
   */
  const articles = await prisma.article.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      municipality: true,
      state: true,
      lat: true,
      lng: true,
      media: {
        select: { name: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 500,
  })

  /**
   * Transformamos los datos para el componente.
   * Aplanamos el objeto media para que sea más fácil de usar.
   * filter(Boolean) elimina los null de lat/lng — TypeScript
   * no sabe que ya filtramos con where, así que lo hacemos
   * explícito para evitar errores de tipos.
   */
  const pins = articles
    .filter(a => a.lat !== null && a.lng !== null)
    .map(a => ({
      id: a.id,
      title: a.title,
      url: a.url,
      category: a.category,
      municipality: a.municipality,
      state: a.state,
      lat: a.lat as number,
      lng: a.lng as number,
      mediaName: a.media.name,
    }))

  return <NewsMap articles={pins} />
}