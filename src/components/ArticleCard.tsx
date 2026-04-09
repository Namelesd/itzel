'use client'

type ArticleWithRelations = {
  id: string
  title: string
  url: string
  excerpt: string | null
  publishedAt: Date
  category: string
  municipality: string | null
  state: string | null
  fidelityScore: number | null
  journalist: { name: string; slug: string; fidelity: number } | null
  media: { name: string; slug: string }
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  politics: { label: 'Política', bg: '#e6f1fb', color: '#185fa5' },
  crime: { label: 'Delitos', bg: '#fcebeb', color: '#a32d2d' },
  economy: { label: 'Economía', bg: '#eaf3de', color: '#3b6d11' },
  sports: { label: 'Deportes', bg: '#faeeda', color: '#854f0b' },
  transit: { label: 'Tránsito', bg: '#eeedfe', color: '#534ab7' },
  civil: { label: 'Civil', bg: '#f5f0e8', color: '#5f5e5a' },
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

function getFidelityColor(score: number): string {
  if (score >= 70) return '#3b6d11'
  if (score >= 40) return '#854f0b'
  return '#a32d2d'
}

function getFidelityBg(score: number): string {
  if (score >= 70) return '#eaf3de'
  if (score >= 40) return '#faeeda'
  return '#fcebeb'
}

function getFidelityLabel(score: number): string {
  if (score >= 80) return 'Muy alta'
  if (score >= 60) return 'Alta'
  if (score >= 40) return 'Media'
  if (score >= 20) return 'Baja'
  return 'Sin datos'
}

export default function ArticleCard({ article }: { article: ArticleWithRelations }) {
  const category = CATEGORY_MAP[article.category] ?? { label: article.category, bg: '#f5f0e8', color: '#5f5e5a' }
  const journalist = article.journalist
  const score = article.fidelityScore

  return (
    <article style={{ border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', background: '#fff', marginBottom: '10px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {article.media.name}
        </span>
        <span style={{ color: '#d3d1c7' }}>•</span>
        <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: category.bg, color: category.color }}>
          {category.label}
        </span>
        {article.municipality && (
          <span style={{ fontSize: '11px', color: '#888780' }}>
            • {article.municipality}{article.state ? `, ${article.state}` : ''}
          </span>
        )}
        <span style={{ fontSize: '11px', color: '#888780', marginLeft: 'auto' }}>
          {formatDate(article.publishedAt)}
        </span>
      </div>

      <a href={article.url} target="_blank" rel="noopener noreferrer">
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1e', lineHeight: '1.4', marginBottom: '6px' }}>
          {article.title}
        </div>
      </a>

      {article.excerpt && (
        <p style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.6', marginBottom: '10px' }}>
          {article.excerpt.slice(0, 200)}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '0.5px solid #f0ede6', flexWrap: 'wrap', gap: '8px' }}>

        {journalist ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#888780' }}>Por</span>
            <a href={'/journalist/' + journalist.slug} style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1e', textDecoration: 'none' }}>
              {journalist.name}
            </a>
            {score != null ? (
              
            <button
  onClick={() => {/* aquí irá el drawer */}}
  style={{
    fontSize: '11px', fontWeight: 500, padding: '2px 10px', borderRadius: '20px',
    background: getFidelityBg(score), color: getFidelityColor(score),
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
    fontFamily: 'inherit',
  }}
>
  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getFidelityColor(score), display: 'inline-block' }} />
  {'Fidelidad ' + Math.round(score) + '/90 · ' + getFidelityLabel(score)}
</button>
            ) : (
              <span style={{
                fontSize: '11px',
                padding: '2px 10px',
                borderRadius: '20px',
                background: '#f0ede6',
                color: '#aaa89f',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d3d1c7', display: 'inline-block' }} />
                Pendiente de análisis
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: '#888780' }}>{article.media.name}</span>
        )}

        {journalist && (
          <a href={'/journalist/' + journalist.slug} style={{ fontSize: '11px', color: '#888780', textDecoration: 'none', border: '0.5px solid #d3d1c7', borderRadius: '20px', padding: '3px 10px' }}>
            Ver periodista →
          </a>
        )}

      </div>
    </article>
  )
}