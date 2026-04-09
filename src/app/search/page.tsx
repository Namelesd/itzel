import { searchArticles, getCategories } from '@/actions/search'
import ArticleCard from '@/components/ArticleCard'

type PageProps = {
  searchParams: Promise<{ query?: string; category?: string; page?: string }>
}

const LABELS: Record<string, string> = {
  politics: 'Política',
  crime: 'Delitos',
  economy: 'Economía',
  sports: 'Deportes',
  transit: 'Tránsito',
  civil: 'Civil',
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.query ?? ''
  const category = params.category
  const page = parseInt(params.page ?? '1', 10)

  const [results, categories] = await Promise.all([
    searchArticles({ query, category, page }),
    getCategories(),
  ])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh', background: '#f5f0e8' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/" style={{ fontSize: '13px', color: '#888780', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>← Inicio</a>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#1a1a1e', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>ITZEL</h1>
        <p style={{ fontSize: '12px', color: '#888780' }}>Plataforma de periodismo · México</p>
      </div>

      <form action="/search" method="GET" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <input
            name="query"
            defaultValue={query}
            placeholder="Busca noticias, periodistas, eventos..."
            style={{ flex: 1, padding: '10px 16px', border: '0.5px solid #d3d1c7', borderRadius: '24px', fontSize: '14px', outline: 'none', background: '#fff', fontFamily: 'inherit', color: '#1a1a1e' }}
          />
          <button type="submit" style={{ padding: '10px 24px', background: '#1a1a1e', color: '#f5f0e8', border: 'none', borderRadius: '24px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Buscar
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a href={'/search' + (query ? '?query=' + query : '')} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', border: '0.5px solid #d3d1c7', textDecoration: 'none', background: !category ? '#1a1a1e' : '#fff', color: !category ? '#f5f0e8' : '#5f5e5a' }}>Todas</a>
          {categories.map(cat => (
            <a key={cat} href={'/search?category=' + cat + (query ? '&query=' + query : '')} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', border: '0.5px solid #d3d1c7', textDecoration: 'none', background: category === cat ? '#1a1a1e' : '#fff', color: category === cat ? '#f5f0e8' : '#5f5e5a' }}>{LABELS[cat] ?? cat}</a>
          ))}
        </div>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid #e8e4d9' }}>
        <p style={{ fontSize: '13px', color: '#888780' }}>
          {results.total === 0
            ? 'Sin resultados'
            : results.total + ' artículos encontrados'}
          {query && <span> para <strong style={{ color: '#1a1a1e' }}>"{query}"</strong></span>}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/journalist" style={{ fontSize: '12px', color: '#888780', textDecoration: 'none' }}>Periodistas →</a>
          <a href="/map" style={{ fontSize: '12px', color: '#888780', textDecoration: 'none' }}>Mapa →</a>
        </div>
      </div>

      {results.articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#888780' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No encontramos artículos.</p>
          <p style={{ fontSize: '13px' }}>Intenta con otras palabras clave o sin tildes.</p>
        </div>
      ) : (
        <div>
          {results.articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {results.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2rem' }}>
          {Array.from({ length: results.pages }, (_, i) => i + 1).map(p => (
            <a key={p} href={'/search?query=' + query + (category ? '&category=' + category : '') + '&page=' + p} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '0.5px solid #d3d1c7', textDecoration: 'none', fontSize: '13px', background: p === page ? '#1a1a1e' : '#fff', color: p === page ? '#f5f0e8' : '#5f5e5a' }}>{p}</a>
          ))}
        </div>
      )}

    </div>
  )
}