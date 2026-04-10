import { prisma } from '@/lib/prisma'
import NewsMap from '@/components/NewsMap'

export default async function MapPage() {
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
      excerpt: true,
      fidelityScore: true,
      media: { select: { name: true } },
      journalist: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 500,
  })

  // Segunda query — artículos sin coordenadas
  const sinUbicacion = await prisma.article.findMany({
    where: {
      OR: [
        { lat: null },
        { lng: null },
      ],
    },
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      municipality: true,
      state: true,
      excerpt: true,
      fidelityScore: true,
      media: { select: { name: true } },
      journalist: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 300,
  })

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
      excerpt: a.excerpt,
      fidelityScore: a.fidelityScore,
      journalistName: a.journalist?.name ?? null,
      journalistSlug: a.journalist?.slug ?? null,
    }))

  const sinUbicacionPins = sinUbicacion.map(a => ({
    id: a.id,
    title: a.title,
    url: a.url,
    category: a.category,
    municipality: a.municipality,
    state: a.state,
    lat: 0,
    lng: 0,
    mediaName: a.media.name,
    excerpt: a.excerpt,
    fidelityScore: a.fidelityScore,
    journalistName: a.journalist?.name ?? null,
    journalistSlug: a.journalist?.slug ?? null,
  }))

  return <NewsMap articles={pins} sinUbicacion={sinUbicacionPins} />
}