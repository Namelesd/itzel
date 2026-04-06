type ArticleWithRelations = {
  id: string
  title: string
  url: string
  excerpt: string | null
  publishedAt: Date
  category: string
  municipality: string | null
  state: string | null
  journalist: { name: string; slug: string; fidelity: number } | null
  media: { name: string; slug: string }
}

const CATEGORY_MAP: Record<string, string> = {
  politics: 'Política',
  crime: 'Delitos',
  economy: 'Economía',
  sports: 'Deportes',
  transit: 'Tránsito',
  civil: 'Civil',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export default function ArticleCard({ article }: { article: ArticleWithRelations }) {
  const categoryLabel = CATEGORY_MAP[article.category] ?? article.category

  const fidelityColor =
    !article.journalist ? '#888780'
    : article.journalist.fidelity >= 70 ? '#3b6d11'
    : article.journalist.fidelity >= 40 ? '#854f0b'
    : '#a32d2d'

  return (
    <article style={{
      border: '0.5px solid #e0ddd6',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      background: '#fff',
      marginBottom: '10px',
    }}>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {article.media.name}
        </span>
        <span style={{ color: '#d3d1c7' }}>•</span>
        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f5f0e8', color: '#5f5e5a' }}>
          {categoryLabel}
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

      {article.journalist && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '0.5px solid #f0ede6' }}>
    <span style={{ fontSize: '12px', color: '#888780' }}>Por</span>
    <a href={'/journalist/' + article.journalist.slug} style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1e', textDecoration: 'none' }}>
      {article.journalist.name}
    </a>
    <span style={{ color: '#d3d1c7', fontSize: '10px' }}>•</span>
    <span style={{ fontSize: '11px', color: fidelityColor }}>
      {'Fidelidad ' + Math.round(article.journalist.fidelity) + '%'}
    </span>
  </div>
)}

    </article>
  )
}