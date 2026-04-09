'use client'

import { useState } from 'react'
import type { FidelityBreakdown as FidelityBreakdownType } from '@/lib/fidelity'

type ArticleScore = {
  id: string
  title: string
  url: string
  publishedAt: Date
  score: number
  breakdown: FidelityBreakdownType
}

type DimConfig = {
  label: string
  value: number
  max: number
  pos: string[]
  neg: string[]
}

type Props = {
  dims: DimConfig[]
  signalCounts: Record<string, number>
  totalArticlesAnalyzed: number
  articleScores: ArticleScore[]
}

export default function FidelityBreakdown({
  dims,
  signalCounts,
  totalArticlesAnalyzed,
  articleScores,
}: Props) {
  const [openDim, setOpenDim] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  /**
   * TOOLTIP GLOBAL FLOTANTE
   * -----------------------
   * En lugar de usar CSS :hover con position absolute dentro
   * de contenedores con overflow, usamos un tooltip global
   * que se posiciona con coordenadas del mouse.
   *
   * onMouseEnter calcula la posición del cursor y guarda el
   * texto a mostrar. onMouseLeave lo limpia.
   * El tooltip se renderiza una sola vez al final del componente,
   * fuera de cualquier contenedor que pueda recortarlo.
   */
  function showTooltip(e: React.MouseEvent, text: string) {
    setTooltip({ text, x: e.clientX, y: e.clientY })
  }

  function hideTooltip() {
    setTooltip(null)
  }

  function getScoreForDim(breakdown: FidelityBreakdownType, dimLabel: string): number {
    switch (dimLabel) {
      case 'Transparencia de fuentes': return breakdown.transparencia
      case 'Densidad factual': return breakdown.densidad
      case 'Lenguaje y precisión': return breakdown.lenguaje
      case 'Validez estructural': return breakdown.estructura
      case 'Diversidad de perspectivas': return breakdown.diversidad
      default: return 0
    }
  }

  function getMaxForDim(dimLabel: string): number {
    return dims.find(d => d.label === dimLabel)?.max ?? 0
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(date))
  }

  /**
   * RAZÓN DEL SCORE — NIVEL PERIODISTA
   * ------------------------------------
   * Explica por qué el promedio del periodista tiene ese score.
   * Usa la frecuencia de señales entre todos sus artículos.
   */
  function generarRazon(value: number, max: number, pos: string[], neg: string[]): string {
    const pct = Math.round((value / max) * 100)
    const nivel = pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo'

    const topPos = pos.filter(s => signalCounts[s] > 0)
      .sort((a, b) => (signalCounts[b] || 0) - (signalCounts[a] || 0))[0]
    const topNeg = neg.filter(s => signalCounts[s] > 0)
      .sort((a, b) => (signalCounts[b] || 0) - (signalCounts[a] || 0))[0]
    const freq = (s: string) => Math.round((signalCounts[s] / totalArticlesAnalyzed) * 100)

    if (nivel === 'alto') {
      if (topPos) return `Score alto (${value}/${max}). "${topPos}" en el ${freq(topPos)}% de sus artículos.`
      return `Score alto (${value}/${max}). Cumple bien con este criterio.`
    }
    if (nivel === 'bajo') {
      if (topNeg) return `Score bajo (${value}/${max}). "${topNeg}" en el ${freq(topNeg)}% de sus artículos.`
      if (topPos) return `Score bajo (${value}/${max}). Solo "${topPos}" en el ${freq(topPos)}% de sus artículos.`
      return `Score bajo (${value}/${max}). No se detectaron señales positivas suficientes.`
    }
    if (topPos && topNeg) {
      return `Score medio (${value}/${max}). "${topPos}" (${freq(topPos)}%) pero también "${topNeg}" (${freq(topNeg)}%).`
    }
    return `Score medio (${value}/${max}).`
  }

  /**
   * RAZÓN DEL SCORE — NIVEL ARTÍCULO
   * ----------------------------------
   * Explica por qué un artículo específico tiene ese score
   * en una dimensión. Incluye la evidencia textual exacta
   * que activó cada señal.
   */
  function getRazonArticulo(
    breakdown: FidelityBreakdownType,
    dimLabel: string,
    pos: string[],
    neg: string[]
  ): string {
    const value = getScoreForDim(breakdown, dimLabel)
    const max = getMaxForDim(dimLabel)
    const pct = Math.round((value / max) * 100)

    const senalesPos = breakdown.signals.filter(s => pos.includes(s))
    const senalesNeg = breakdown.signals.filter(s => neg.includes(s))

    const evidenciaTexto = (signal: string): string => {
      const ev = breakdown.evidence?.[signal]
      if (ev && ev.length > 0) return `: "${ev.slice(0, 2).join('", "')}"`
      return ''
    }

    if (pct >= 70) {
      if (senalesPos.length > 0) {
        return `Score alto (${value}/${max}). ${senalesPos.map(s => s + evidenciaTexto(s)).join('. ')}.`
      }
      return `Score alto (${value}/${max}).`
    }
    if (pct <= 30) {
      if (senalesNeg.length > 0) {
        return `Score bajo (${value}/${max}). ${senalesNeg.map(s => s + evidenciaTexto(s)).join('. ')}.`
      }
      return `Score bajo (${value}/${max}). Sin señales positivas detectadas.`
    }

    const partes: string[] = []
    if (senalesPos.length > 0) partes.push('Positivo: ' + senalesPos.map(s => s + evidenciaTexto(s)).join(', '))
    if (senalesNeg.length > 0) partes.push('Negativo: ' + senalesNeg.map(s => s + evidenciaTexto(s)).join(', '))
    return partes.length > 0 ? partes.join('. ') + '.' : `Score ${value}/${max}.`
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780' }}>
          Desglose del índice de fidelidad
        </p>
        <a href="/about/fidelidad" style={{ fontSize: '11px', color: '#888780', textDecoration: 'none', border: '0.5px solid #d3d1c7', borderRadius: '20px', padding: '3px 10px' }}>
          ¿Cómo funciona?
        </a>
      </div>

      {dims.map((dim, i) => {
        const pct = Math.round((dim.value / dim.max) * 100)
        const barColor = pct >= 70 ? '#3b6d11' : pct >= 40 ? '#854f0b' : '#a32d2d'
        const razon = generarRazon(dim.value, dim.max, dim.pos, dim.neg)
        const isOpen = openDim === i

        const senalesDetectadas = [...dim.pos, ...dim.neg]
          .filter(s => signalCounts[s] > 0)
          .sort((a, b) => (signalCounts[b] || 0) - (signalCounts[a] || 0))

        const articulosOrdenados = [...articleScores].sort(
          (a, b) => getScoreForDim(b.breakdown, dim.label) - getScoreForDim(a.breakdown, dim.label)
        )

        return (
          <div key={dim.label} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '0.5px solid #f0ede6' }}>

            {/* HEADER: nombre + tooltip + score + botón */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1e' }}>{dim.label}</span>
                <span
                  onMouseEnter={e => showTooltip(e, razon)}
                  onMouseLeave={hideTooltip}
                  style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f5f0e8', border: '0.5px solid #d3d1c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#888780', cursor: 'help', flexShrink: 0 }}
                >?</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: barColor }}>{dim.value}/{dim.max}</span>
                <button
                  onClick={() => setOpenDim(isOpen ? null : i)}
                  style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d3d1c7', background: isOpen ? '#f5f0e8' : '#fff', color: '#888780', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {articleScores.length} artículos {isOpen ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {/* BARRA DE PROGRESO */}
            <div style={{ height: '4px', background: '#f5f0e8', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', width: pct + '%', background: barColor, borderRadius: '2px' }} />
            </div>

            {/* SEÑALES CON CONTEO */}
            {senalesDetectadas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {senalesDetectadas.map(signal => {
                  const count = signalCounts[signal] || 0
                  const isNeg = dim.neg.includes(signal)
                  const freqPct = Math.round((count / totalArticlesAnalyzed) * 100)

                  return (
                    <div key={signal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#fafaf8', borderRadius: '8px', border: '0.5px solid #f0ede6' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isNeg ? '#a32d2d' : '#3b6d11', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#1a1a1e', flex: 1 }}>{signal}</span>
                      <span style={{ fontSize: '11px', color: '#888780', background: '#f5f0e8', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {count}/{totalArticlesAnalyzed} artículos · {freqPct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* DROPDOWN DE ARTÍCULOS */}
            {isOpen && (
              <div style={{ marginTop: '12px', border: '0.5px solid #e8e4d9', borderRadius: '8px', overflow: 'hidden' }}>

                <div style={{ padding: '8px 14px', background: '#f5f0e8', borderBottom: '0.5px solid #e8e4d9' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Score por artículo — {dim.label}
                  </span>
                </div>

                {articulosOrdenados.map((article, idx) => {
                  const dimScore = getScoreForDim(article.breakdown, dim.label)
                  const dimMax = getMaxForDim(dim.label)
                  const dimPct = Math.round((dimScore / dimMax) * 100)
                  const dimColor = dimPct >= 70 ? '#3b6d11' : dimPct >= 40 ? '#854f0b' : '#a32d2d'
                  const razonArticulo = getRazonArticulo(article.breakdown, dim.label, dim.pos, dim.neg)

                  return (
                    <div
                      key={article.id}
                      style={{ padding: '10px 14px', borderBottom: idx < articulosOrdenados.length - 1 ? '0.5px solid #f5f0e8' : 'none', display: 'grid', gridTemplateColumns: '48px 1fr 20px', alignItems: 'center', gap: '12px' }}
                    >
                      {/* SCORE */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: 500, color: dimColor, display: 'block', lineHeight: 1 }}>{dimScore}</span>
                        <span style={{ fontSize: '10px', color: '#888780' }}>/{dimMax}</span>
                      </div>

                      {/* TÍTULO Y FECHA */}
                      <div style={{ minWidth: 0 }}>
                        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1e', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {article.title}
                        </a>
                        <span style={{ fontSize: '11px', color: '#888780' }}>{formatDate(article.publishedAt)}</span>
                      </div>

                      {/* TOOLTIP POR ARTÍCULO */}
                      <span
                        onMouseEnter={e => showTooltip(e, razonArticulo)}
                        onMouseLeave={hideTooltip}
                        style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f5f0e8', border: '0.5px solid #d3d1c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#888780', cursor: 'help', flexShrink: 0 }}
                      >?</span>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )
      })}

      <p style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>
        Basado en {totalArticlesAnalyzed} artículos analizados
      </p>

      {/* TOOLTIP GLOBAL — renderizado fuera de cualquier contenedor con overflow */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x + 12, window.innerWidth - 240),
          top: tooltip.y - 10,
          background: '#1a1a1e',
          color: '#f5f0e8',
          fontSize: '12px',
          lineHeight: '1.5',
          padding: '8px 12px',
          borderRadius: '8px',
          maxWidth: '240px',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {tooltip.text}
        </div>
      )}

    </div>
  )
}