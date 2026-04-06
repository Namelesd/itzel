export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      background: '#f5f0e8',
    }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>

        <p style={{
          fontSize: '11px',
          letterSpacing: '0.1em',
          color: '#8b7355',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Plataforma de periodismo · México
        </p>

        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '56px',
          fontWeight: 400,
          lineHeight: '1',
          color: '#1a1a1e',
          marginBottom: '16px',
          letterSpacing: '-2px',
        }}>
          ITZEL
        </h1>

        <p style={{
          fontSize: '15px',
          color: '#5f5e5a',
          lineHeight: '1.7',
          marginBottom: '32px',
        }}>
          Transparencia radical sobre el periodismo mexicano.
          Busca noticias, conoce al periodista que las escribió
          y analiza el sesgo editorial con inteligencia artificial.
        </p>

        <form action="/search" method="GET">
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
  name="query"
  placeholder="Busca noticias, periodistas, municipios..."
  style={{
    flex: 1,
    padding: '12px 18px',
    border: '0.5px solid #d3d1c7',
    borderRadius: '28px',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
    fontFamily: 'inherit',
    color: '#1a1a1e',
  }}
/>
            <button
              type="submit"
              style={{
                padding: '12px 28px',
                background: '#1a1a1e',
                color: '#f5f0e8',
                border: 'none',
                borderRadius: '28px',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Buscar
            </button>
          </div>
        </form>

        <p style={{
          fontSize: '12px',
          color: '#888780',
          marginTop: '16px',
          fontStyle: 'italic',
        }}>
          nāhuatl · luz de luna
        </p>

      </div>
    </main>
  )
}