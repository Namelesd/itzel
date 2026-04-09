'use client'

import { useEffect } from 'react'

/**
 * COMPONENTE: ArticleHighlighter
 * ============================================================
 * Lee el hash de la URL (ej: #article-abc123) y aplica
 * un resaltado visual al artículo correspondiente.
 *
 * Por qué Client Component:
 * - window.location.hash solo existe en el navegador
 * - useEffect corre después de que el DOM está listo
 * - El Server Component no puede leer el hash — el hash
 *   nunca se envía al servidor, solo existe en el cliente
 *
 * scrollMarginTop en el artículo garantiza que el scroll
 * no quede tapado por ningún header fijo.
 * ============================================================
 */
export default function ArticleHighlighter() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#article-')) return

    const el = document.getElementById(hash.slice(1))
    if (!el) return

    /**
     * RESALTADO VISUAL
     * ----------------
     * Aplicamos un borde y fondo de color para distinguir
     * el artículo al que llegó el usuario desde el badge.
     * La transición suaviza el cambio de color.
     */
    el.style.border = '1.5px solid #854f0b'
    el.style.background = '#fffaf5'
    el.style.boxShadow = '0 0 0 4px rgba(133, 79, 11, 0.08)'
    el.style.transition = 'all 0.3s ease'

    /**
     * Scroll suave al artículo después de un pequeño delay.
     * El delay es necesario porque el DOM puede no estar
     * completamente pintado cuando el effect corre.
     */
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)

    /**
     * Quitamos el resaltado después de 4 segundos para
     * que no quede permanentemente resaltado si el usuario
     * sigue navegando en la misma página.
     */
    const timeout = setTimeout(() => {
      el.style.border = '0.5px solid #e0ddd6'
      el.style.background = '#fff'
      el.style.boxShadow = 'none'
    }, 4000)

    return () => clearTimeout(timeout)
  }, [])

  return null
}