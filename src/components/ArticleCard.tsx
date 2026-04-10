'use client'

import { useState } from 'react'
import { calcularFidelidad } from '@/lib/fidelity'

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

const DIM_CONFIGS = [
  { label: 'Fuentes', key: 'transparencia' as const, max: 25, desc: 'Transparencia y nombramiento de fuentes', signals: ['Múltiples fuentes nombradas', 'Una fuente nombrada', 'Incluye citas textuales', 'Sin fuentes explícitas'] },
  { label: 'Densidad factual', key: 'densidad' as const, max: 20, desc: 'Fechas, cifras y nombres verificables', signals: ['Incluye fechas', 'Incluye datos numéricos', 'Menciona personas o instituciones', 'Lenguaje emocionalmente cargado'] },
  { label: 'Lenguaje', key: 'lenguaje' as const, max: 20, desc: 'Precisión vs ambigüedad en el lenguaje', signals: ['Lenguaje preciso', 'Alto uso de lenguaje ambiguo', 'Lenguaje ambiguo moderado', 'Algo de lenguaje ambiguo'] },
  { label: 'Estructura', key: 'estructura' as const, max: 15, desc: 'Contexto, antecedentes y desarrollo', signals: ['Artículo con desarrollo suficiente', 'Incluye contexto o antecedentes', 'Artículo muy breve'] },
  { label: 'Perspectivas', key: 'diversidad' as const, max: 10, desc: 'Contraste de versiones del evento', signals: ['Contrasta múltiples perspectivas', 'Menciona perspectiva alternativa', 'Sin perspectivas contrastantes'] },
]

const NEG_SIGNALS = new Set([
  'Sin fuentes explícitas', 'Lenguaje emocionalmente cargado',
  'Lenguaje favorable sin contraste',
  'Alto uso de lenguaje ambiguo', 'Lenguaje ambiguo moderado',
  'Algo de lenguaje ambiguo', 'Artículo muy breve', 'Sin perspectivas contrastantes',
])

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  const category = CATEGORY_MAP[article.category] ?? { label: article.category, bg: '#f5f0e8', color: '#5f5e5a' }
  const journalist = article.journalist
  const score = article.fidelityScore

  const textoTotal = article.title + ' ' + (article.excerpt ?? '')
  const breakdown = textoTotal.length > 80
    ? calcularFidelidad(article.title, article.excerpt)
    : null

  return (
    <>
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
                  onClick={() => setDrawerOpen(true)}
                  title="Ver desglose de fidelidad"
                  style={{
                    fontSize: '11px', fontWeight: 500, padding: '2px 10px', borderRadius: '20px',
                    background: getFidelityBg(score), color: getFidelityColor(score),
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: '4px', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getFidelityColor(score), display: 'inline-block' }} />
                  {'Fidelidad ' + Math.round(score) + '/90 · ' + getFidelityLabel(score)}
                </button>
              ) : (
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#f0ede6', color: '#aaa89f', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* OVERLAY */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 998, cursor: 'pointer' }}
        />
      )}

      {/* DRAWER */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%',
        width: 'min(400px, 92vw)', background: '#fff',
        borderLeft: '0.5px solid #e0ddd6', zIndex: 999,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto', boxSizing: 'border-box',
      }}>
        <div style={{ padding: '1.25rem' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780' }}>
              Desglose de fidelidad
            </p>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{ background: '#f5f0e8', border: '0.5px solid #e0ddd6', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', color: '#5f5e5a', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>

          {/* TÍTULO */}
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e', lineHeight: '1.4', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid #f0ede6' }}>
            {article.title}
          </p>

          {score != null && breakdown ? (
            <>
              {/* SCORE TOTAL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem', padding: '12px', background: '#fafaf8', borderRadius: '10px', border: '0.5px solid #f0ede6' }}>
                <span style={{ fontSize: '28px', fontWeight: 500, color: getFidelityColor(score) }}>
                  {Math.round(score)}
                  <span style={{ fontSize: '14px', color: '#888780' }}>/90</span>
                </span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: getFidelityColor(score) }}>{getFidelityLabel(score)}</p>
                  <p style={{ fontSize: '11px', color: '#aaa89f' }}>Score de este artículo</p>
                </div>
              </div>

              {/* DIMENSIONES */}
              {DIM_CONFIGS.map(dim => {
                const value = breakdown[dim.key]
                const pct = Math.round((value / dim.max) * 100)
                const dimColor = pct >= 70 ? '#3b6d11' : pct >= 40 ? '#854f0b' : '#a32d2d'
                const senalesDetectadas = dim.signals.filter(s => breakdown.signals.includes(s))
                const evidencias = senalesDetectadas
                  .flatMap(s => breakdown.evidence?.[s] ?? [])
                  .slice(0, 2)

                return (
                  <div key={dim.label} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: '0.5px solid #f0ede6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1e' }}>{dim.label}</span>
                        <span style={{ fontSize: '11px', color: '#aaa89f', marginLeft: '6px' }}>{dim.desc}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: dimColor, flexShrink: 0, marginLeft: '8px' }}>{value}/{dim.max}</span>
                    </div>
                    <div style={{ height: '4px', background: '#f0ede6', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{ height: '100%', width: pct + '%', background: dimColor, borderRadius: '2px' }} />
                    </div>
                    {senalesDetectadas.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: evidencias.length > 0 ? '4px' : '0' }}>
                        {senalesDetectadas.map(s => (
                          <span key={s} style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: NEG_SIGNALS.has(s) ? '#fcebeb' : '#eaf3de', color: NEG_SIGNALS.has(s) ? '#a32d2d' : '#3b6d11' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {evidencias.length > 0 && (
                      <p style={{ fontSize: '11px', color: '#888780', fontStyle: 'italic', marginTop: '2px' }}>
                        {evidencias.map(e => `"${e}"`).join(' · ')}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* LINK PERIODISTA */}
           {journalist != null && (
  
   <a href={'/journalist/' + journalist.slug + '#article-' + article.id}
    style={{ display: 'block', marginTop: '1rem', textAlign: 'center', fontSize: '12px', color: '#888780', textDecoration: 'none', border: '0.5px solid #d3d1c7', borderRadius: '20px', padding: '8px' }}
  >
    {'Ver historial de ' + journalist.name + ' →'}
  </a>
)}
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '2rem' }}>
              Sin suficiente texto para analizar.
            </p>
          )}

        </div>
      </div>
    </>
  )
}