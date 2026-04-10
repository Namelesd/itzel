'use client'

import { useEffect, useRef, useState } from 'react'
import { calcularFidelidad } from '@/lib/fidelity'

type ArticlePin = {
  id: string
  title: string
  url: string
  category: string
  municipality: string | null
  state: string | null
  lat: number
  lng: number
  mediaName: string
  excerpt: string | null
  fidelityScore: number | null
  journalistName: string | null
  journalistSlug: string | null
}

type Props = {
  articles: ArticlePin[]
  sinUbicacion: ArticlePin[]
}

const CATEGORY_COLORS: Record<string, string> = {
  politics: '#185fa5',
  crime: '#a32d2d',
  economy: '#3b6d11',
  sports: '#854f0b',
  transit: '#534ab7',
  civil: '#5f5e5a',
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: 'Política',
  crime: 'Delitos',
  economy: 'Economía',
  sports: 'Deportes',
  transit: 'Tránsito',
  civil: 'Civil',
}

const DIM_CONFIGS = [
  { label: 'Fuentes', key: 'transparencia' as const, max: 25, signals: ['Múltiples fuentes nombradas', 'Una fuente nombrada', 'Incluye citas textuales', 'Sin fuentes explícitas'] },
  { label: 'Densidad', key: 'densidad' as const, max: 20, signals: ['Incluye fechas', 'Incluye datos numéricos', 'Menciona personas o instituciones', 'Lenguaje emocionalmente cargado'] },
  { label: 'Lenguaje', key: 'lenguaje' as const, max: 20, signals: ['Lenguaje preciso', 'Alto uso de lenguaje ambiguo', 'Lenguaje ambiguo moderado', 'Algo de lenguaje ambiguo'] },
  { label: 'Estructura', key: 'estructura' as const, max: 15, signals: ['Artículo con desarrollo suficiente', 'Incluye contexto o antecedentes', 'Artículo muy breve'] },
  { label: 'Perspectivas', key: 'diversidad' as const, max: 10, signals: ['Contrasta múltiples perspectivas', 'Menciona perspectiva alternativa', 'Sin perspectivas contrastantes'] },
]

const NEG_SIGNALS = new Set([
  'Sin fuentes explícitas', 'Lenguaje emocionalmente cargado',
  'Lenguaje favorable sin contraste', 'Alto uso de lenguaje ambiguo',
  'Lenguaje ambiguo moderado', 'Algo de lenguaje ambiguo',
  'Artículo muy breve', 'Sin perspectivas contrastantes',
])

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

function jitter(value: number): number {
  return value + (Math.random() - 0.5) * 0.008
}

function ArticleFidelityCard({ article }: { article: ArticlePin }) {
  const score = article.fidelityScore
  const textoTotal = article.title + ' ' + (article.excerpt ?? '')
  const breakdown = textoTotal.length > 80
    ? calcularFidelidad(article.title, article.excerpt)
    : null

  return (
    <div style={{ padding: '0.75rem', borderBottom: '0.5px solid #f0ede6', marginBottom: '4px' }}>

      {/* HEADER */}
      <div style={{ fontSize: '10px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
        {article.mediaName} · {CATEGORY_LABELS[article.category] ?? article.category}
        
      </div>

      {/* TÍTULO */}
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e', textDecoration: 'none', lineHeight: '1.4', display: 'block', marginBottom: '6px' }}>
        {article.title}
      </a>

      {/* PERIODISTA */}
      {article.journalistName && (
        <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px' }}>
          Por{' '}
          <a href={'/journalist/' + article.journalistSlug} style={{ color: '#5f5e5a', textDecoration: 'none', fontWeight: 500 }}>
            {article.journalistName}
          </a>
        </p>
      )}

      {/* BADGE DE FIDELIDAD */}
      {score != null ? (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 10px', borderRadius: '20px', background: getFidelityBg(score), color: getFidelityColor(score), display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getFidelityColor(score), display: 'inline-block' }} />
            {'Fidelidad ' + Math.round(score) + '/90 · ' + getFidelityLabel(score)}
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#f0ede6', color: '#aaa89f', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d3d1c7', display: 'inline-block' }} />
            Pendiente de análisis
          </span>
        </div>
      )}

      {/* DESGLOSE POR DIMENSIÓN */}
      {breakdown && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '6px' }}>
            {DIM_CONFIGS.map(dim => {
              const value = breakdown[dim.key]
              const pct = Math.round((value / dim.max) * 100)
              const dimColor = pct >= 70 ? '#3b6d11' : pct >= 40 ? '#854f0b' : '#a32d2d'
              const senalesDetectadas = dim.signals.filter(s => breakdown.signals.includes(s))
              const evidencias = senalesDetectadas.flatMap(s => breakdown.evidence?.[s] ?? []).slice(0, 2)
              const tooltipText = [
                senalesDetectadas.length > 0 ? senalesDetectadas.join(' · ') : 'Sin señales',
                evidencias.length > 0 ? 'Detectado: ' + evidencias.map(e => '"' + e + '"').join(' · ') : '',
              ].filter(Boolean).join('\n')

              return (
                <div
                  key={dim.label}
                  title={tooltipText}
                  style={{ padding: '4px 6px', background: '#fafaf8', borderRadius: '6px', border: '0.5px solid #f0ede6', cursor: 'help' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#888780' }}>{dim.label}</span>
                    <span style={{ fontSize: '9px', fontWeight: 500, color: dimColor }}>{value}/{dim.max}</span>
                  </div>
                  <div style={{ height: '2px', background: '#f0ede6', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: dimColor, borderRadius: '1px' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* SEÑALES */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {breakdown.signals.map(signal => (
              <span
                key={signal}
                style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                  background: NEG_SIGNALS.has(signal) ? '#fcebeb' : '#eaf3de',
                  color: NEG_SIGNALS.has(signal) ? '#a32d2d' : '#3b6d11',
                }}
              >
                {signal}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function NewsMap({ articles, sinUbicacion  }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedArticles, setSelectedArticles] = useState<ArticlePin[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [sinUbicacionOpen, setSinUbicacionOpen] = useState(false)

  useEffect(() => {
    if (!mapRef.current) return
    let map: any

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      map = new mapboxgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-102.5528, 23.6345],
        zoom: 5,
        minZoom: 4,
        maxZoom: 14,
        maxBounds: [[-118.5, 14.5], [-86.5, 32.7]],
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstanceRef.current = map
      map.on('load', () => addMarkers(mapboxgl, map, articles, null))
    }

    initMap()
    return () => { if (map) map.remove() }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    const run = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      addMarkers(mapboxgl, mapInstanceRef.current, articles, activeCategory)
    }
    run()
  }, [activeCategory])

  function addMarkers(mapboxgl: any, map: any, pins: ArticlePin[], category: string | null) {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const filtered = category ? pins.filter(p => p.category === category) : pins

    const groups: Record<string, ArticlePin[]> = {}
    filtered.forEach(article => {
      const key = article.lat.toFixed(4) + ',' + article.lng.toFixed(4)
      if (!groups[key]) groups[key] = []
      groups[key].push(article)
    })

    Object.values(groups).forEach(group => {
      group.forEach((article, index) => {
        const lat = index === 0 ? article.lat : jitter(article.lat)
        const lng = index === 0 ? article.lng : jitter(article.lng)
        const color = CATEGORY_COLORS[article.category] ?? '#5f5e5a'

        const el = document.createElement('div')

        if (group.length > 1 && index === 0) {
          el.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;font-family:sans-serif;'
          el.textContent = String(group.length)
          el.addEventListener('click', () => {
            setSelectedArticles(group)
            setPanelOpen(true)
            setSinUbicacionOpen(false)
          })
          new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map)
          markersRef.current.push({ remove: () => el.remove() })
        } else if (group.length === 1) {
          el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;'
          el.addEventListener('click', () => {
            setSelectedArticles([article])
            setPanelOpen(true)
            setSinUbicacionOpen(false)
          })
          new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map)
          markersRef.current.push({ remove: () => el.remove() })
        }
      })
    })
  }

  const withCoords = articles.filter(a => a.lat && a.lng).length

  const btnBase: React.CSSProperties = {
    fontSize: '11px', padding: '4px 12px', borderRadius: '20px',
    cursor: 'pointer', fontFamily: 'inherit', border: '0.5px solid #d3d1c7',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f0e8' }}>

      <div style={{ padding: '1rem 1.5rem', borderBottom: '0.5px solid #e0ddd6', background: '#fff', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 500, color: '#1a1a1e', marginBottom: '2px' }}>Mapa de noticias</h1>
          <p style={{ fontSize: '12px', color: '#888780' }}>{withCoords} noticias con ubicación</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button onClick={() => setActiveCategory(null)} style={{ ...btnBase, background: !activeCategory ? '#1a1a1e' : '#fff', color: !activeCategory ? '#f5f0e8' : '#5f5e5a' }}>Todas</button>
          {Object.keys(CATEGORY_COLORS).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} style={{ ...btnBase, border: '0.5px solid ' + CATEGORY_COLORS[cat], background: activeCategory === cat ? CATEGORY_COLORS[cat] : '#fff', color: activeCategory === cat ? '#fff' : CATEGORY_COLORS[cat] }}>
              {CATEGORY_LABELS[cat]}
            </button>
            
          ))}
          <button
  onClick={() => {
    setSinUbicacionOpen(true)
    setPanelOpen(false)
  }}
  style={{
    ...btnBase,
    background: sinUbicacionOpen ? '#1a1a1e' : '#fff',
    color: sinUbicacionOpen ? '#f5f0e8' : '#5f5e5a',
    display: 'flex', alignItems: 'center', gap: '6px',
  }}
>
  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sinUbicacionOpen ? '#f5f0e8' : '#888780', display: 'inline-block' }} />
  Sin ubicación ({sinUbicacion.length})
</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* PANEL LATERAL */}
        {panelOpen && selectedArticles.length > 0 && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: '360px', height: '100%', background: '#fff', borderLeft: '0.5px solid #e0ddd6', overflowY: 'auto', zIndex: 10 }}>
            <div style={{ padding: '1rem', borderBottom: '0.5px solid #e0ddd6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e' }}>
                  {selectedArticles[0].municipality || selectedArticles[0].state || 'Sin ubicación'}
                </p>
                <p style={{ fontSize: '11px', color: '#888780' }}>{selectedArticles.length} {selectedArticles.length === 1 ? 'noticia' : 'noticias'}</p>
              </div>
              <button onClick={() => setPanelOpen(false)} style={{ border: 'none', background: '#f5f0e8', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', color: '#5f5e5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ padding: '0.5rem' }}>
              {selectedArticles.map(article => (
                <ArticleFidelityCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        )}
        {/* PANEL SIN UBICACIÓN */}
{sinUbicacionOpen && (
  <div style={{
    position: 'absolute', top: 0, right: 0, width: '360px', height: '100%',
    background: '#fff', borderLeft: '0.5px solid #e0ddd6',
    overflowY: 'auto', zIndex: 10,
  }}>
    <div style={{
      padding: '1rem', borderBottom: '0.5px solid #e0ddd6',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, background: '#fff', zIndex: 1,
    }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e' }}>Sin ubicación detectada</p>
        <p style={{ fontSize: '11px', color: '#888780' }}>{sinUbicacion.length} noticias</p>
      </div>
      <button
        onClick={() => setSinUbicacionOpen(false)}
        style={{ border: 'none', background: '#f5f0e8', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', color: '#5f5e5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >×</button>
    </div>

    <div style={{ padding: '4px 8px 8px', background: '#fafaf8', margin: '8px', borderRadius: '8px', border: '0.5px solid #f0ede6' }}>
      <p style={{ fontSize: '11px', color: '#888780', padding: '6px 4px' }}>
        Estas noticias no tienen municipio o estado identificado — pueden ser cobertura internacional o artículos donde el lugar no se menciona explícitamente.
      </p>
    </div>

    <div style={{ padding: '0.5rem' }}>
      {sinUbicacion.map(article => (
        <ArticleFidelityCard key={article.id} article={article} />
      ))}
    </div>
  </div>
)}
      </div>

    </div>
  )
}