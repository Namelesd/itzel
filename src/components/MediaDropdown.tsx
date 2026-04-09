'use client'

import { useState } from 'react'

type MediaItem = {
  name: string
  slug: string
  count: number
}

type Props = {
  mediaList: MediaItem[]
  query: string
}

export default function MediaDropdown({ mediaList, query }: Props) {
  const [open, setOpen] = useState(false)

  if (mediaList.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>

      <button onClick={() => setOpen(!open)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: '0.5px solid #d3d1c7', background: open ? '#1a1a1e' : '#fff', color: open ? '#f5f0e8' : '#5f5e5a', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Medios</span>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: open ? 'rgba(255,255,255,0.2)' : '#f5f0e8', color: open ? '#f5f0e8' : '#8b7355' }}>{mediaList.length}</span>
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />

          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '260px', background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden' }}>

            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f0ede6', background: '#fafaf8' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Medios que cubrieron esto</p>
            </div>

            {mediaList.map((media, i) => (
              <div key={media.slug} style={{ borderBottom: i < mediaList.length - 1 ? '0.5px solid #f5f0e8' : 'none' }}>
                <a href={'/search?query=' + query + '&media=' + media.slug} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', textDecoration: 'none', background: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: '#8b7355', flexShrink: 0 }}>
                      {media.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', color: '#1a1a1e', fontWeight: 500 }}>{media.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: '#f5f0e8', color: '#8b7355' }}>{media.count}</span>
                </a>
              </div>
            ))}

          </div>
        </>
      )}

    </div>
  )
}