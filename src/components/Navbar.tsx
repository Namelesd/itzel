'use client'

/**
 * 'use client' es obligatorio aquí porque usamos usePathname(),
 * un hook de React que solo funciona en componentes cliente.
 * Los Server Components de Next.js no tienen acceso al pathname
 * en tiempo de render — solo el cliente sabe en qué ruta está.
 */

import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',           label: 'Inicio' },
  { href: '/search',     label: 'Buscar' },
  { href: '/map',        label: 'Mapa' },
  { href: '/journalist', label: 'Periodistas' },
]

export default function Navbar() {
  const pathname = usePathname()

  /**
   * LÓGICA DE LINK ACTIVO
   * ----------------------
   * Para "/" usamos igualdad exacta — de lo contrario "/" matchearía
   * todas las rutas porque todas empiezan con /.
   * Para el resto usamos startsWith() para cubrir subrutas:
   * /journalist/carmen-aristegui → resalta "Periodistas" automáticamente.
   */
  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#fff',
      borderBottom: '0.5px solid #e0ddd6',
      /**
       * backdropFilter: cuando el usuario hace scroll, el contenido
       * pasa "por detrás" de la navbar con un leve desenfoque.
       * WebkitBackdropFilter es el prefijo necesario para Safari.
       */
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '52px',
      }}>

        {/* MARCA */}
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 400, color: '#1a1a1e', textDecoration: 'none', letterSpacing: '0.04em', lineHeight: 1 }}>ITZEL</a>

        {/* LINKS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {NAV_LINKS.map(link => {
            const active = isActive(link.href)
            return (
              <a key={link.href} href={link.href} style={{ fontSize: '13px', fontWeight: active ? 500 : 400, color: active ? '#1a1a1e' : '#888780', textDecoration: 'none', padding: '6px 12px', borderRadius: '20px', background: active ? '#f5f0e8' : 'transparent', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s, color 0.15s' }}>
                {/**
                 * Punto verde solo en el link activo.
                 * Reutiliza #3b6d11, el color semántico de fidelidad alta —
                 * no introduce ningún color nuevo al sistema de diseño.
                 */}
                {active && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b6d11', flexShrink: 0, display: 'inline-block' }} />}
                {link.label}
              </a>
            )
          })}
        </div>

      </div>
    </nav>
  )
}