import { prisma } from '@/lib/prisma'

export default async function JournalistListPage() {
  const journalists = await prisma.journalist.findMany({
    include: {
      media: true,
      _count: { select: { articles: true } },
    },
    orderBy: { articles: { _count: 'desc' } },
    take: 50,
  })

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh', background: '#f5f0e8' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b7355', marginBottom: '8px' }}>ITZEL · Directorio</p>
        <h1 style={{ fontSize: '28px', fontWeight: 500, color: '#1a1a1e', marginBottom: '4px' }}>Periodistas</h1>
        <p style={{ fontSize: '13px', color: '#888780' }}>{journalists.length} periodistas indexados</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
        {journalists.map(journalist => {
          const iniciales = journalist.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
          const fidelityColor = journalist.fidelity >= 70 ? '#3b6d11' : journalist.fidelity >= 40 ? '#854f0b' : '#a32d2d'
          const isActive = journalist.status === 'active'
          const statusLabel = journalist.status === 'active' ? 'Activo' : journalist.status === 'missing' ? 'Desaparecido' : journalist.status === 'deceased' ? 'Fallecido' : 'Activo'
          const statusBg = journalist.status === 'active' ? '#eaf3de' : journalist.status === 'missing' ? '#faeeda' : journalist.status === 'deceased' ? '#fcebeb' : '#eaf3de'
          const statusColor = journalist.status === 'active' ? '#3b6d11' : journalist.status === 'missing' ? '#854f0b' : journalist.status === 'deceased' ? '#a32d2d' : '#3b6d11'

          return (
            <div key={journalist.id} style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <a href={'/journalist/' + journalist.slug} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e8e4d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 500, color: '#5f5e5a', flexShrink: 0 }}>
                    {iniciales}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{journalist.name}</p>
                    {journalist.media && (
                      <p style={{ fontSize: '11px', color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{journalist.media.name}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: statusBg, color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
                    <span style={{ fontSize: '11px', color: '#888780' }}>{journalist._count.articles} artículos</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: fidelityColor }}>{Math.round(journalist.fidelity)}%</span>
                </div>
              </a>
            </div>
          )
        })}
      </div>

    </div>
  )
}