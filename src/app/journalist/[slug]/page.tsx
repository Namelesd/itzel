/**
 * PÁGINA: /journalist/[slug]
 * ============================================================
 * Esta página muestra el perfil completo de un periodista.
 *
 * [slug] en el nombre de la carpeta significa que es una
 * ruta dinámica — Next.js acepta cualquier valor ahí y lo
 * pasa como parámetro. Así "jose-cueli" y "david-brooks"
 * usan el mismo archivo pero muestran datos distintos.
 *
 * generateMetadata: función especial de Next.js que genera
 * el título y descripción de la página para SEO.
 * Cada periodista tendrá su propia meta descripción.
 * ============================================================
 */

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

type PageProps = {
  params: { slug: string }
}

/**
 * FUNCIÓN: getFidelityColor
 * -------------------------
 * Devuelve color según el score de fidelidad.
 * Verde > 70, Naranja 40-70, Rojo < 40
 */
function getFidelityColor(score: number): string {
  if (score >= 70) return '#3b6d11'
  if (score >= 40) return '#854f0b'
  return '#a32d2d'
}

/**
 * FUNCIÓN: getFidelityLabel
 * -------------------------
 * Texto descriptivo del score para que el usuario
 * entienda qué significa el número.
 */
function getFidelityLabel(score: number): string {
  if (score >= 80) return 'Muy alta'
  if (score >= 60) return 'Alta'
  if (score >= 40) return 'Media'
  if (score >= 20) return 'Baja'
  return 'Sin datos suficientes'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: 'Política',
  crime: 'Delitos',
  economy: 'Economía',
  sports: 'Deportes',
  transit: 'Tránsito',
  civil: 'Civil',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Activo', color: '#3b6d11', bg: '#eaf3de' },
  missing: { label: 'Desaparecido', color: '#854f0b', bg: '#faeeda' },
  deceased: { label: 'Fallecido', color: '#a32d2d', bg: '#fcebeb' },
  exiled: { label: 'Exiliado', color: '#534ab7', bg: '#eeedfe' },
  threatened: { label: 'Amenazado', color: '#854f0b', bg: '#faeeda' },
}


  /**
   * Buscamos al periodista por su slug único.
   * include: traemos también sus artículos y el medio actual.
   * orderBy en articles: más recientes primero.
   * take: 50 — máximo 50 artículos en el perfil.
   */
export default async function JournalistPage({ params }: PageProps) {
  const { slug } = await params
  const journalist = await prisma.journalist.findUnique({
    where: { slug },
    include: {
      media: true,
      articles: {
        include: { media: true },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      },
    },
  })

  /**
   * notFound() es una función de Next.js que muestra
   * la página 404 si el periodista no existe en la DB.
   * Es mejor que mostrar una página vacía.
   */
  if (!journalist) notFound()

  const status = STATUS_CONFIG[journalist.status] ?? STATUS_CONFIG.active
  const fidelityColor = getFidelityColor(journalist.fidelity)
  const fidelityLabel = getFidelityLabel(journalist.fidelity)

  /**
   * CALCULAR ESTADÍSTICAS
   * ---------------------
   * Calculamos en el servidor para no mandar lógica al cliente.
   *
   * reduce: recorre todos los artículos y acumula conteos
   * por categoría. El resultado es un objeto como:
   * { politics: 12, economy: 5, crime: 3 }
   */
  const categoryCounts = journalist.articles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0]

  /**
   * MEDIOS ÚNICOS
   * -------------
   * Lista de medios donde ha publicado el periodista.
   * Set elimina duplicados — si publicó 20 artículos en
   * La Jornada, solo aparece una vez.
   */
  const mediosUnicos = [...new Set(
    journalist.articles.map(a => a.media.name)
  )]

  const iniciales = journalist.name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh', background: '#f5f0e8' }}>

      {/* BOTÓN REGRESAR */}
      <a href="/search" style={{ fontSize: '13px', color: '#888780', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
        ← Regresar a búsqueda
      </a>

      {/* FICHA DEL PERIODISTA */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>

          {/* AVATAR CON INICIALES */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: '#e8e4d9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '24px', fontWeight: 500,
            color: '#5f5e5a', flexShrink: 0,
          }}>
            {iniciales}
          </div>

          <div style={{ flex: 1 }}>
            {/* NOMBRE Y STATUS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1a1a1e' }}>
                {journalist.name}
              </h1>
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '3px 10px',
                borderRadius: '20px', background: status.bg, color: status.color,
              }}>
                {status.label}
              </span>
            </div>

            {/* MEDIO ACTUAL */}
            {journalist.media && (
              <p style={{ fontSize: '13px', color: '#888780', marginBottom: '8px' }}>
                {journalist.media.name}
              </p>
            )}

            {/* ESTADÍSTICAS RÁPIDAS */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#888780' }}>
                <strong style={{ color: '#1a1a1e' }}>{journalist.articles.length}</strong> artículos indexados
              </span>
              {topCategory && (
                <span style={{ fontSize: '12px', color: '#888780' }}>
                  Cubre principalmente <strong style={{ color: '#1a1a1e' }}>{CATEGORY_LABELS[topCategory[0]] ?? topCategory[0]}</strong>
                </span>
              )}
              {mediosUnicos.length > 1 && (
                <span style={{ fontSize: '12px', color: '#888780' }}>
                  <strong style={{ color: '#1a1a1e' }}>{mediosUnicos.length}</strong> medios
                </span>
              )}
            </div>
          </div>

          {/* ÍNDICE DE FIDELIDAD */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {/**
             * CÍRCULO DE FIDELIDAD
             * --------------------
             * Usamos SVG para el círculo de progreso.
             * stroke-dasharray define la longitud total del círculo.
             * stroke-dashoffset define cuánto está "oculto".
             * Con radio 36, la circunferencia es 2π×36 ≈ 226.
             *
             * Si el score es 75, mostramos 75% del círculo:
             * offset = 226 - (226 * 75/100) = 226 - 169.5 = 56.5
             */}
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" fill="none" stroke="#e8e4d9" strokeWidth="6" />
              <circle
                cx="45" cy="45" r="36"
                fill="none"
                stroke={fidelityColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="226"
                strokeDashoffset={226 - (226 * Math.min(journalist.fidelity, 100) / 100)}
                transform="rotate(-90 45 45)"
              />
              <text x="45" y="45" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="500" fill={fidelityColor}>
                {Math.round(journalist.fidelity)}
              </text>
            </svg>
            <p style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>Fidelidad</p>
            <p style={{ fontSize: '11px', fontWeight: 500, color: fidelityColor }}>{fidelityLabel}</p>
          </div>

        </div>
      </div>

      {/* DISTRIBUCIÓN POR CATEGORÍA */}
      {Object.keys(categoryCounts).length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '12px' }}>
            Cobertura por categoría
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <span key={cat} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#f5f0e8', color: '#5f5e5a' }}>
                  {CATEGORY_LABELS[cat] ?? cat} ({count})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* HISTORIAL DE ARTÍCULOS */}
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '1rem' }}>
          Artículos indexados
        </p>

        {journalist.articles.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#888780' }}>
            <p>No hay artículos indexados todavía.</p>
          </div>
        ) : (
          journalist.articles.map(article => (
            <div key={article.id} style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '8px' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {article.media.name}
                </span>
                <span style={{ color: '#d3d1c7', fontSize: '10px' }}>•</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f5f0e8', color: '#5f5e5a' }}>
                  {CATEGORY_LABELS[article.category] ?? article.category}
                </span>
                {article.municipality && (
                  <span style={{ fontSize: '11px', color: '#888780' }}>
                    • {article.municipality}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: '#888780', marginLeft: 'auto' }}>
                  {formatDate(article.publishedAt)}
                </span>
              </div>

              
             <a href={article.url} target="_blank" rel="noopener noreferrer">
  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1e', lineHeight: '1.4', marginBottom: '4px' }}>
    {article.title}
  </div>
</a>

              {article.excerpt && (
                <p style={{ fontSize: '12px', color: '#5f5e5a', lineHeight: '1.5', marginTop: '4px' }}>
                  {article.excerpt.slice(0, 150)}
                </p>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  )
}