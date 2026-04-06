'use client'

import { useEffect, useRef, useState } from 'react'

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
}

type Props = {
  articles: ArticlePin[]
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

/**
 * JITTER — dispersión aleatoria de coordenadas
 * ---------------------------------------------
 * Cuando múltiples artículos tienen exactamente las mismas
 * coordenadas (ej: 20 artículos de CDMX), todos se apilan
 * en un punto y solo se ve uno.
 *
 * Solución: agregar una pequeña variación aleatoria (~500m)
 * a cada coordenada para que los pins se separen visualmente.
 *
 * 0.005 grados ≈ 500 metros — suficiente para verlos separados
 * pero tan pequeño que no distorsiona la ubicación real.
 */
function jitter(value: number): number {
  return value + (Math.random() - 0.5) * 0.008
}

export default function NewsMap({ articles }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedArticles, setSelectedArticles] = useState<ArticlePin[]>([])
  const [panelOpen, setPanelOpen] = useState(false)

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

    /**
     * AGRUPAR POR UBICACIÓN
     * ---------------------
     * Agrupamos artículos que tienen exactamente las mismas
     * coordenadas antes de aplicar el jitter.
     * Así sabemos cuántos hay en cada punto para mostrar el número.
     */
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
          /**
           * PIN CON NÚMERO — para el primer artículo del grupo
           * Muestra cuántos artículos hay en esa ubicación.
           */
          el.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;font-family:sans-serif;'
          el.textContent = String(group.length)

          el.addEventListener('click', () => {
            setSelectedArticles(group)
            setPanelOpen(true)
          })

          new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map)
          markersRef.current.push({ remove: () => el.remove() })
        } else if (group.length === 1) {
          /**
           * PIN SIMPLE — artículo único en esa ubicación
           * Muestra popup directo al hacer click.
           */
          el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;'

          const locationHtml = article.municipality
            ? '<div style="font-size:11px;color:#888780;margin-top:4px;">' + article.municipality + (article.state ? ', ' + article.state : '') + '</div>'
            : article.state
            ? '<div style="font-size:11px;color:#888780;margin-top:4px;">' + article.state + '</div>'
            : ''

          const popup = new mapboxgl.Popup({ offset: 10, maxWidth: '280px' }).setHTML(
            '<div style="font-family:sans-serif;padding:4px 0;">' +
            '<div style="font-size:10px;color:#888780;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">' + article.mediaName + ' · ' + (CATEGORY_LABELS[article.category] ?? article.category) + '</div>' +
            '<a href="' + article.url + '" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:500;color:#1a1a1e;text-decoration:none;line-height:1.4;display:block;">' + article.title + '</a>' +
            locationHtml +
            '</div>'
          )

          const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).setPopup(popup).addTo(map)
          markersRef.current.push(marker)
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
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* PANEL LATERAL — lista de artículos del grupo */}
        {panelOpen && selectedArticles.length > 0 && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: '320px', height: '100%', background: '#fff', borderLeft: '0.5px solid #e0ddd6', overflowY: 'auto', zIndex: 10 }}>
            <div style={{ padding: '1rem', borderBottom: '0.5px solid #e0ddd6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e' }}>
                  {selectedArticles[0].municipality || selectedArticles[0].state || 'Sin ubicación'}
                </p>
                <p style={{ fontSize: '11px', color: '#888780' }}>{selectedArticles.length} noticias</p>
              </div>
              <button onClick={() => setPanelOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#888780', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '0.75rem' }}>
              {selectedArticles.map(article => (
                <div key={article.id} style={{ padding: '0.75rem', borderBottom: '0.5px solid #f0ede6', marginBottom: '4px' }}>
                  <div style={{ fontSize: '10px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    {article.mediaName} · {CATEGORY_LABELS[article.category] ?? article.category}
                  </div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e', textDecoration: 'none', lineHeight: '1.4', display: 'block' }}>
                    {article.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}