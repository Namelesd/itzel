/**
 * PÁGINA: /about/fidelidad
 * ============================================================
 * Explica al lector cómo funciona el Índice de Fidelidad.
 * Es una página estática — no necesita 'use client' ni
 * fetch de datos. Next.js la renderizará como Server Component
 * por defecto, lo que significa que se genera en el servidor
 * y llega al navegador como HTML puro: más rápido y mejor
 * para SEO.
 * ============================================================
 */

export default function SobreFidelidadPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem', minHeight: '100vh', background: '#f5f0e8' }}>

      {/* NAVEGACIÓN DE REGRESO */}
      <a href="/search" style={{ fontSize: '13px', color: '#888780', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>← Regresar a búsqueda</a>

      {/* ENCABEZADO */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, color: '#1a1a1e', marginBottom: '8px', lineHeight: 1.3 }}>Índice de Fidelidad</h1>
        <p style={{ fontSize: '15px', color: '#5f5e5a', lineHeight: '1.7', margin: 0 }}>
          Una medida de qué tan verificable y transparente es el periodismo de un artículo o un periodista, calculada automáticamente mediante análisis de texto.
        </p>
      </div>

      {/* NOTA METODOLÓGICA */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '8px' }}>Nota metodológica</p>
        <p style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.7', margin: 0 }}>
          El índice no evalúa si una noticia es verdadera o falsa. Evalúa <strong style={{ color: '#1a1a1e' }}>cómo está escrita</strong>: si cita fuentes identificables, si usa lenguaje preciso, si incluye datos verificables y si contrasta perspectivas. Un artículo con score alto sigue buenas prácticas periodísticas; uno con score bajo puede ser perfectamente verídico pero carecer de transparencia.
        </p>
      </div>

      {/* LAS 5 DIMENSIONES */}
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '1rem' }}>Las 5 dimensiones</p>

      {[
        {
          numero: '01',
          label: 'Transparencia de fuentes',
          max: 25,
          color: '#185fa5',
          bg: '#e6f1fb',
          desc: 'Detecta si el artículo cita fuentes identificables por nombre e institución, y si incluye citas textuales. Es la dimensión con mayor peso porque la transparencia de fuentes es el principio más básico del periodismo verificable.',
          positivo: ['Múltiples fuentes nombradas (+15 pts)', 'Una fuente nombrada (+8 pts)', 'Incluye citas textuales (+10 pts)'],
          negativo: ['Sin fuentes explícitas (0 pts en esta dimensión)'],
        },
        {
          numero: '02',
          label: 'Densidad factual',
          max: 20,
          color: '#3b6d11',
          bg: '#eaf3de',
          desc: 'Mide el ratio entre datos verificables — fechas, cifras, nombres propios — versus afirmaciones valorativas. Un artículo con muchos adjetivos cargados emocionalmente y pocas fechas o números concretos tiene baja densidad factual.',
          positivo: ['Incluye fechas (+5 pts)', 'Incluye datos numéricos (+8 pts)', 'Menciona personas o instituciones (+7 pts)'],
          negativo: ['Lenguaje emocionalmente cargado (−5 pts)'],
        },
        {
          numero: '03',
          label: 'Lenguaje y precisión',
          max: 20,
          color: '#854f0b',
          bg: '#faeeda',
          desc: 'Penaliza el uso de lenguaje vago, evasivo o especulativo. Expresiones como "se rumorea que", "al parecer", "fuentes cercanas" o el abuso de condicionales ("habría", "podría ser") reducen la calificación porque hacen imposible verificar la afirmación.',
          positivo: ['Lenguaje preciso (20 pts, score base completo)'],
          negativo: ['Algo de lenguaje ambiguo (−3 pts)', 'Lenguaje ambiguo moderado (−8 pts)', 'Alto uso de lenguaje ambiguo (−15 pts)'],
        },
        {
          numero: '04',
          label: 'Validez estructural',
          max: 15,
          color: '#534ab7',
          bg: '#eeedfe',
          desc: 'Evalúa si el artículo tiene suficiente desarrollo — longitud mínima, contexto histórico, antecedentes. Una nota muy breve, aunque use lenguaje preciso, carece de la estructura necesaria para contextualizar un hecho.',
          positivo: ['Artículo con desarrollo suficiente (+5 pts)', 'Incluye contexto o antecedentes (+10 pts)'],
          negativo: ['Artículo muy breve (0 pts en esta dimensión)'],
        },
        {
          numero: '05',
          label: 'Diversidad de perspectivas',
          max: 10,
          color: '#5f5e5a',
          bg: '#f5f0e8',
          desc: 'Detecta si el artículo presenta más de una versión del evento: negaciones, rechazos, versiones contrarias o la voz de múltiples actores. Un artículo que solo presenta un lado de la historia obtiene 0 en esta dimensión.',
          positivo: ['Menciona perspectiva alternativa (+5 pts)', 'Contrasta múltiples perspectivas (+10 pts)'],
          negativo: ['Sin perspectivas contrastantes (0 pts en esta dimensión)'],
        },
      ].map(dim => (
        <div key={dim.numero} style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1.25rem', marginBottom: '10px' }}>

          {/* HEADER DE DIMENSIÓN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#888780' }}>{dim.numero}</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1e', flex: 1 }}>{dim.label}</span>
            <span style={{ fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: dim.bg, color: dim.color }}>Hasta {dim.max} pts</span>
          </div>

          {/* DESCRIPCIÓN */}
          <p style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.65', marginBottom: '12px' }}>{dim.desc}</p>

          {/* SEÑALES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {dim.positivo.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b6d11', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#3b6d11' }}>{s}</span>
              </div>
            ))}
            {dim.negativo.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a32d2d', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#a32d2d' }}>{s}</span>
              </div>
            ))}
          </div>

        </div>
      ))}

      {/* SCORE DE PERIODISTA */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', padding: '1.25rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '8px' }}>Score de periodista vs score de artículo</p>
        <p style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.7', marginBottom: '10px' }}>
          Cada artículo recibe su propio score de 0 a 90. El score del periodista es el promedio de todos sus artículos analizados, con un bonus adicional de hasta 10 puntos por <strong style={{ color: '#1a1a1e' }}>consistencia histórica</strong>.
        </p>
        <p style={{ fontSize: '13px', color: '#5f5e5a', lineHeight: '1.7', margin: 0 }}>
          El bonus de consistencia se calcula a partir de la desviación estándar de los scores individuales: un periodista cuyos artículos siempre obtienen scores similares entre sí es más predecible y confiable que uno con scores muy variables, aunque el promedio sea el mismo.
        </p>
      </div>

      {/* TABLA DE NIVELES */}
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888780', marginBottom: '1rem' }}>Escala de interpretación</p>

      <div style={{ background: '#fff', border: '0.5px solid #e0ddd6', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
        {[
          { rango: '80 – 100', label: 'Muy alta', color: '#3b6d11', bg: '#eaf3de', desc: 'Periodismo con fuentes explícitas, datos verificables, lenguaje preciso y perspectivas contrastantes.' },
          { rango: '60 – 79',  label: 'Alta',     color: '#3b6d11', bg: '#eaf3de', desc: 'Buenas prácticas en la mayoría de dimensiones. Puede mejorar en diversidad de perspectivas o estructura.' },
          { rango: '40 – 59',  label: 'Media',    color: '#854f0b', bg: '#faeeda', desc: 'Cumple algunos criterios pero presenta debilidades en fuentes o lenguaje ambiguo.' },
          { rango: '20 – 39',  label: 'Baja',     color: '#a32d2d', bg: '#fcebeb', desc: 'Artículos frecuentemente sin fuentes identificables, lenguaje vago o sin desarrollo suficiente.' },
          { rango: '0 – 19',   label: 'Sin datos suficientes', color: '#a32d2d', bg: '#fcebeb', desc: 'Texto demasiado breve para análisis confiable, o ausencia total de señales positivas.' },
        ].map((nivel, i, arr) => (
          <div key={nivel.rango} style={{ display: 'grid', gridTemplateColumns: '90px 100px 1fr', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f0ede6' : 'none' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#888780' }}>{nivel.rango}</span>
            <span style={{ fontSize: '12px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: nivel.bg, color: nivel.color, textAlign: 'center' }}>{nivel.label}</span>
            <span style={{ fontSize: '12px', color: '#5f5e5a', lineHeight: '1.5' }}>{nivel.desc}</span>
          </div>
        ))}
      </div>

      {/* PIE */}
      <p style={{ fontSize: '12px', color: '#888780', lineHeight: '1.6' }}>
        El algoritmo es de código abierto y no utiliza inteligencia artificial externa — corre completamente en el servidor mediante análisis de patrones lingüísticos con expresiones regulares. Esto garantiza reproducibilidad y ausencia de sesgos de modelos de lenguaje.
      </p>

    </div>
  )
}