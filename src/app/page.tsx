export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      background: '#f5f0e8'
    }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>

        <p style={{
          fontSize: '11px', letterSpacing: '0.1em',
          color: '#8b7355', textTransform: 'uppercase', marginBottom: '16px'
        }}>
          Plataforma de periodismo · México
        </p>

        <h1 style={{
          fontFamily: 'Georgia, serif', fontSize: '56px',
          fontWeight: '400', lineHeight: '1', color: '#1a1a1e',
          marginBottom: '16px', letterSpacing: '-2px'
        }}>
          ITZEL
        </h1>

        <p style={{
          fontSize: '16px', color: '#5f5e5a',
          lineHeight: '1.7', marginBottom: '32px'
        }}>
          Transparencia radical sobre el periodismo mexicano.
          Noticias verificadas, perfiles de reporteros
          y análisis de sesgo con inteligencia artificial.
        </p>

        <p style={{ fontSize: '12px', color: '#888780', fontStyle: 'italic' }}>
          nāhuatl · luz de luna
        </p>
      </div>
    </main>
  );
}