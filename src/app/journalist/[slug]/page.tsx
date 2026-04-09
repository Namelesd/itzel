import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { calcularFidelidad } from '@/lib/fidelity'
import FidelityBreakdown from '@/components/FidelityBreakdown'
import ArticleHighlighter from '@/components/ArticleHighlighter'

type PageProps = {
  params: Promise<{ slug: string }>
}

function getFidelityColor(score: number): string {
  if (score >= 70) return '#3b6d11'
  if (score >= 40) return '#854f0b'
  return '#a32d2d'
}

function getFidelityLabel(score: number): string {
  if (score >= 80) return 'Muy alta'
  if (score >= 60) return 'Alta'
  if (score >= 40) return 'Media'
  if (score >= 20) return 'Baja'
  return 'Sin datos suficientes'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: 'Política',
  crime: 'Delitos',
  economy: 'Economía',
  sports: 'Deportes',
  transit: 'Tránsito',
  civil: 'Civil',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Activo', color: '#3b6d11', bg: '#eaf3de' },
  missing: { label: 'Desaparecido', color: '#854f0b', bg: '#faeeda' },
  deceased: { label: 'Fallecido', color: '#a32d2d', bg: '#fcebeb' },
  exiled: { label: 'Exiliado', color: '#534ab7', bg: '#eeedfe' },
  threatened: { label: 'Amenazado', color: '#854f0b', bg: '#faeeda' },
}

export default async function JournalistPage({ params }: PageProps) {
  const { slug } = await params

  const journalist = await prisma.journalist.findUnique({
    where: { slug },
    include: {
      media: true,
      articles: {
        include: { media: true },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!journalist) notFound()

  const status = STATUS_CONFIG[journalist.status] ?? STATUS_CONFIG.active
  const fidelityColor = getFidelityColor(journalist.fidelity)
  const fidelityLabel = getFidelityLabel(journalist.fidelity)

  const categoryCounts = journalist.articles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

  const mediosUnicos = [...new Set(journalist.articles.map(a => a.media.name))]

  const iniciales = journalist.name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const breakdowns = journalist.articles
    .filter(a => (a.title + ' ' + (a.excerpt ?? '')).length > 80)
    .map(a => calcularFidelidad(a.title, a.excerpt))

  const signalCounts: Record<string, number> = {}
  breakdowns.forEach(b => {
    b.signals.forEach(s => {
      signalCounts[s] = (signalCounts[s] || 0) + 1
    })
  })

  const totalArticlesAnalyzed = breakdowns.length

  const avgBreakdown = breakdowns.length > 0 ? {
    transparencia: Math.round(breakdowns.reduce((s, b) => s + b.transparencia, 0) / breakdowns.length),
    densidad: Math.round(breakdowns.reduce((s, b) => s + b.densidad, 0) / breakdowns.length),
    lenguaje: Math.round(breakdowns.reduce((s, b) => s + b.lenguaje, 0) / breakdowns.length),
    estructura: Math.round(breakdowns.reduce((s, b) => s + b.estructura, 0) / breakdowns.length),
    diversidad: Math.round(breakdowns.reduce((s, b) => s + b.diversidad, 0) / breakdowns.length),
  } : null

  const dims = [
    {
      label: 'Transparencia de fuentes',
      value: avgBreakdown?.transparencia ?? 0,
      max: 25,
      desc: 'Evalúa si el artículo cita fuentes identificables con nombre e institución',
      pos: ['Múltiples fuentes nombradas', 'Una fuente nombrada', 'Incluye citas textuales'],
      neg: ['Sin fuentes explícitas'],
    },
    {
      label: 'Densidad factual',
      value: avgBreakdown?.densidad ?? 0,
      max: 20,
      desc: 'Ratio entre datos verificables (fechas, cifras, nombres) vs afirmaciones valorativas',
      pos: ['Incluye fechas', 'Incluye datos numéricos', 'Menciona personas o instituciones'],
      neg: ['Lenguaje emocionalmente cargado'],
    },
    {
      label: 'Lenguaje y precisión',
      value: avgBreakdown?.lenguaje ?? 0,
      max: 20,
      desc: 'Detecta lenguaje vago, evasivo o emocionalmente cargado',
      pos: ['Lenguaje preciso'],
      neg: ['Alto uso de lenguaje ambiguo', 'Lenguaje ambiguo moderado', 'Algo de lenguaje ambiguo'],
    },
    {
      label: 'Validez estructural',
      value: avgBreakdown?.estructura ?? 0,
      max: 15,
      desc: 'Evalúa si el artículo tiene contexto, antecedentes y desarrollo suficiente',
      pos: ['Artículo con desarrollo suficiente', 'Incluye contexto o antecedentes'],
      neg: ['Artículo muy breve'],
    },
    {
      label: 'Diversidad de perspectivas',
      value: avgBreakdown?.diversidad ?? 0,
      max: 10,
      desc: 'Evalúa si el artículo contrasta más de una versión del evento',
      pos: ['Contrasta múltiples perspectivas', 'Menciona perspectiva alternativa'],
      neg: ['Sin perspectivas contrastantes'],
    },
  ]

  function generarRazon(
    value: number,
    max: number,
    pos: string[],
    neg: string[]
  ): string {
    const pct = Math.round((value / max) * 100)
    const nivel = pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo'

    const topPos = pos
      .filter(s => signalCounts[s] > 0)
      .sort((a, b) => (signalCounts[b] || 0) - (signalCounts[a] || 0))[0]

    const topNeg = neg
      .filter(s => signalCounts[s] > 0)
      .sort((a, b) => (signalCounts[b] || 0) - (signalCounts[a] || 0))[0]

    const freq = (s: string) => Math.round((signalCounts[s] / totalArticlesAnalyzed) * 100)

    if (nivel === 'alto') {
      if (topPos) return `Score alto (${value}/${max}). "${topPos}" en el ${freq(topPos)}% de sus artículos.`
      return `Score alto (${value}/${max}). Cumple bien con este criterio.`
    }

    if (nivel === 'bajo') {
      if (topNeg) return `Score bajo (${value}/${max}). "${topNeg}" detectado en el ${freq(topNeg)}% de sus artículos.`
      if (topPos) return `Score bajo (${value}/${max}). Solo "${topPos}" en el ${freq(topPos)}% de sus artículos.`
      return `Score bajo (${value}/${max}). No se detectaron señales positivas suficientes.`
    }

    if (topPos && topNeg) {
      return `Score medio (${value}/${max}). "${topPos}" (${freq(topPos)}%) pero también "${topNeg}" (${freq(topNeg)}%).`
    }

    return `Score medio (${value}/${max}).`
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem', minHeight: '100vh', background: '#f5f0e8' }}>
<ArticleHighlighter />
      <a href="/search" style={{ fontSize: '13px', color: '#888780', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Regresar a búsqueda</a>

      {/* FICHA PRINCIPAL */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>

          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#e8e4d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 500, color: '#5f5e5a', flexShrink: 0 }}>
            {iniciales}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1a1a1e' }}>{journalist.name}</h1>
              <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: status.bg, color: status.color }}>{status.label}</span>
            </div>
            {journalist.media && (
              <p style={{ fontSize: '13px', color: '#888780', marginBottom: '8px' }}>{journalist.media.name}</p>
            )}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#888780' }}>
                <strong style={{ color: '#1a1a1e' }}>{journalist.articles.length}</strong> artículos indexados
              </span>
              {topCategory && (
                <span style={{ fontSize: '12px', color: '#888780' }}>
                  Cubre principalmente <strong style={{ color: '#1a1a1e' }}>{CATEGORY_LABELS[topCategory[0]] ?? topCategory[0]}</strong>
                </span>
              )}
              {mediosUnicos.length > 1 && (
                <span style={{ fontSize: '12px', color: '#888780' }}>
                  <strong style={{ color: '#1a1a1e' }}>{mediosUnicos.length}</strong> medios
                </span>
              )}
            </div>
          </div>

          {/* CÍRCULO DE FIDELIDAD */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" fill="none" stroke="#e8e4d9" strokeWidth="6" />
              <circle cx="45" cy="45" r="36" fill="none" stroke={fidelityColor} strokeWidth="6" strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 - (226 * Math.min(journalist.fidelity, 100) / 100)} transform="rotate(-90 45 45)" />
              <text x="45" y="45" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="500" fill={fidelityColor}>{Math.round(journalist.fidelity)}</text>
            </svg>
            <p style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>Fidelidad</p>
            <p style={{ fontSize: '11px', fontWeight: 500, color: fidelityColor }}>{fidelityLabel}</p>
            <a href="/about/fidelidad" style={{ fontSize: '11px', color: '#888780', textDecoration: 'none', border: '0.5px solid #d3d1c7', borderRadius: '20px', padding: '3px 10px', display: 'inline-block', marginTop: '8px' }}>¿Cómo se calcula?</a>
          </div>

        </div>
      </div>

      {/* COBERTURA POR CATEGORÍA */}
      {Object.keys(categoryCounts).length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '12px' }}>Cobertura por categoría</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <span key={cat} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#f5f0e8', color: '#5f5e5a' }}>
                {CATEGORY_LABELS[cat] ?? cat} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

     {/* DESGLOSE DEL ÍNDICE DE FIDELIDAD */}
{avgBreakdown && (
  <FidelityBreakdown
    dims={dims}
    signalCounts={signalCounts}
    totalArticlesAnalyzed={totalArticlesAnalyzed}
    articleScores={journalist.articles
      .filter(a => (a.title + ' ' + (a.excerpt ?? '')).length > 80)
      .map(a => ({
        id: a.id,
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        score: calcularFidelidad(a.title, a.excerpt).total,
        breakdown: calcularFidelidad(a.title, a.excerpt),
      }))}
  />
)}

   {/* HISTORIAL DE ARTÍCULOS */}
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '1rem' }}>
          Artículos indexados
        </p>

        {journalist.articles.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#888780' }}>
            <p>No hay artículos indexados todavía.</p>
          </div>
        ) : (
          journalist.articles.map(article => {
            /**
             * SCORE INDIVIDUAL POR ARTÍCULO
             * ------------------------------
             * Calculamos el desglose de fidelidad para cada
             * artículo individualmente — así podemos mostrarlo
             * cuando el usuario llega desde el badge de fidelidad.
             *
             * Solo calculamos si tiene suficiente texto.
             */
            const textoTotal = article.title + ' ' + (article.excerpt ?? '')
            const artBreakdown = textoTotal.length > 80
              ? calcularFidelidad(article.title, article.excerpt)
              : null

            const artScore = artBreakdown?.total ?? 0
            const artColor = artScore >= 70 ? '#3b6d11' : artScore >= 40 ? '#854f0b' : '#a32d2d'
            const artBg = artScore >= 70 ? '#eaf3de' : artScore >= 40 ? '#faeeda' : '#fcebeb'

            return (
              <div
                key={article.id}
                id={'article-' + article.id}
                style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '8px', scrollMarginTop: '24px' }}
              >
                {/* HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{article.media.name}</span>
                  <span style={{ color: '#d3d1c7', fontSize: '10px' }}>•</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f5f0e8', color: '#5f5e5a' }}>{CATEGORY_LABELS[article.category] ?? article.category}</span>
                  {article.municipality && (
                    <span style={{ fontSize: '11px', color: '#888780' }}>• {article.municipality}</span>
                  )}
                  <span style={{ fontSize: '11px', color: '#888780', marginLeft: 'auto' }}>{formatDate(article.publishedAt)}</span>
                </div>

                {/* TÍTULO */}
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1e', lineHeight: '1.4', marginBottom: '6px' }}>{article.title}</div>
                </a>

                {/* EXCERPT */}
                {article.excerpt && (
                  <p style={{ fontSize: '12px', color: '#5f5e5a', lineHeight: '1.5', marginBottom: '10px' }}>{article.excerpt.slice(0, 200)}</p>
                )}

                {/* SCORE INDIVIDUAL */}
                {artBreakdown && (
                  <div style={{ borderTop: '0.5px solid #f0ede6', paddingTop: '10px', marginTop: '4px' }}>

                    {/* SCORE TOTAL */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#888780' }}>Score de fidelidad de este artículo:</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, padding: '2px 10px', borderRadius: '20px', background: artBg, color: artColor }}>
                        {artScore}/90
                      </span>
                    </div>

                    {/* DESGLOSE POR DIMENSIÓN */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
                      {[
                        { label: 'Fuentes', value: artBreakdown.transparencia, max: 25 },
                        { label: 'Densidad factual', value: artBreakdown.densidad, max: 20 },
                        { label: 'Lenguaje', value: artBreakdown.lenguaje, max: 20 },
                        { label: 'Estructura', value: artBreakdown.estructura, max: 15 },
                        { label: 'Perspectivas', value: artBreakdown.diversidad, max: 10 },
                      ].map(dim => {
                        const dimPct = Math.round((dim.value / dim.max) * 100)
                        const dimColor = dimPct >= 70 ? '#3b6d11' : dimPct >= 40 ? '#854f0b' : '#a32d2d'
                        return (
                          <div key={dim.label} style={{ padding: '6px 8px', background: '#fafaf8', borderRadius: '8px', border: '0.5px solid #f0ede6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#888780' }}>{dim.label}</span>
                              <span style={{ fontSize: '11px', fontWeight: 500, color: dimColor }}>{dim.value}/{dim.max}</span>
                            </div>
                            <div style={{ height: '3px', background: '#f0ede6', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: dimPct + '%', background: dimColor, borderRadius: '2px' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* SEÑALES DETECTADAS */}
                    {artBreakdown.signals.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {artBreakdown.signals.map(signal => {
                          const isNeg = [
                            'Sin fuentes explícitas',
                            'Lenguaje emocionalmente cargado',
                            'Alto uso de lenguaje ambiguo',
                            'Lenguaje ambiguo moderado',
                            'Algo de lenguaje ambiguo',
                            'Artículo muy breve',
                            'Sin perspectivas contrastantes',
                          ].includes(signal)

                          /**
                           * EVIDENCIA DE LA SEÑAL
                           * ---------------------
                           * Mostramos el texto exacto que activó
                           * cada señal entre paréntesis.
                           */
                          const ev = artBreakdown.evidence?.[signal]
                          const evText = ev && ev.length > 0 ? ' · "' + ev[0].slice(0, 40) + '"' : ''

                          return (
                            <span key={signal} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: isNeg ? '#fcebeb' : '#eaf3de', color: isNeg ? '#a32d2d' : '#3b6d11' }}>
                              {signal}{evText}
                            </span>
                          )
                        })}
                      </div>
                    )}

                  </div>
                )}

              </div>
            )
          })
        )}
      </div>

    </div>
  )
}