/**
 * BACKFILL DE UBICACIONES
 * ============================================================
 * Re-analiza los artículos sin estado/municipio asignado.
 * Hace fetch del contenido completo si no lo tiene guardado,
 * o usa el título + excerpt existente como fallback.
 *
 * Ejecutar con: npx tsx backfill-ubicaciones.ts
 * ============================================================
 */

import { prisma } from './src/lib/prisma'
import { extraerContenidoArticulo } from './scraper/src/fetcher'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Copiamos los mismos MUNICIPIOS y ESTADOS del scraper
// para mantener consistencia en la detección
const MUNICIPIOS: Record<string, { lat: number; lng: number; state: string; variantes?: string[] }> = {
  'Ciudad de México': { lat: 19.4326, lng: -99.1332, state: 'CDMX', variantes: ['CDMX', 'Ciudad de Mexico', 'DF', 'D.F.', 'Distrito Federal'] },
  'Guadalajara': { lat: 20.6597, lng: -103.3496, state: 'Jalisco', variantes: ['Gdl', 'ZMG'] },
  'Zapopan': { lat: 20.7214, lng: -103.3916, state: 'Jalisco', variantes: [] },
  'Monterrey': { lat: 25.6866, lng: -100.3161, state: 'Nuevo León', variantes: ['MTY'] },
  'Tijuana': { lat: 32.5149, lng: -117.0382, state: 'Baja California', variantes: ['TJ'] },
  'Hermosillo': { lat: 29.0729, lng: -110.9559, state: 'Sonora', variantes: [] },
  'Culiacán': { lat: 24.8091, lng: -107.394, state: 'Sinaloa', variantes: ['Culiacan'] },
  'Chihuahua': { lat: 28.6329, lng: -106.0691, state: 'Chihuahua', variantes: [] },
  'Ciudad Juárez': { lat: 31.6904, lng: -106.4245, state: 'Chihuahua', variantes: ['Juarez', 'Juárez', 'Cd. Juárez'] },
  'Puebla': { lat: 19.0414, lng: -98.2063, state: 'Puebla', variantes: ['Heroica Puebla'] },
  'Mérida': { lat: 20.9674, lng: -89.5926, state: 'Yucatán', variantes: ['Merida'] },
  'León': { lat: 21.1221, lng: -101.6824, state: 'Guanajuato', variantes: ['Leon'] },
  'Acapulco': { lat: 16.8531, lng: -99.8237, state: 'Guerrero', variantes: [] },
  'Morelia': { lat: 19.706, lng: -101.195, state: 'Michoacán', variantes: [] },
  'Oaxaca': { lat: 17.0732, lng: -96.7266, state: 'Oaxaca', variantes: [] },
  'Veracruz': { lat: 19.1738, lng: -96.1342, state: 'Veracruz', variantes: [] },
  'Cancún': { lat: 21.1619, lng: -86.8515, state: 'Quintana Roo', variantes: ['Cancun'] },
  'Saltillo': { lat: 25.4232, lng: -100.9963, state: 'Coahuila', variantes: [] },
  'Torreón': { lat: 25.5428, lng: -103.418, state: 'Coahuila', variantes: ['Torreon'] },
  'Querétaro': { lat: 20.5888, lng: -100.3899, state: 'Querétaro', variantes: ['Queretaro'] },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855, state: 'San Luis Potosí', variantes: ['SLP'] },
  'Toluca': { lat: 19.2826, lng: -99.6557, state: 'Estado de México', variantes: [] },
  'Durango': { lat: 24.0277, lng: -104.6532, state: 'Durango', variantes: [] },
  'Tuxtla Gutiérrez': { lat: 16.7521, lng: -93.1151, state: 'Chiapas', variantes: ['Tuxtla'] },
  'Villahermosa': { lat: 17.9869, lng: -92.9303, state: 'Tabasco', variantes: [] },
  'Tepic': { lat: 21.5042, lng: -104.8945, state: 'Nayarit', variantes: [] },
  'Cuernavaca': { lat: 18.9242, lng: -99.2216, state: 'Morelos', variantes: [] },
  'Pachuca': { lat: 20.1011, lng: -98.7591, state: 'Hidalgo', variantes: [] },
  'Zacatecas': { lat: 22.7709, lng: -102.5832, state: 'Zacatecas', variantes: [] },
  'Aguascalientes': { lat: 21.8818, lng: -102.2916, state: 'Aguascalientes', variantes: ['Ags'] },
  'Colima': { lat: 19.2452, lng: -103.7241, state: 'Colima', variantes: [] },
  'La Paz': { lat: 24.1426, lng: -110.3128, state: 'Baja California Sur', variantes: [] },
  'Campeche': { lat: 19.8301, lng: -90.5349, state: 'Campeche', variantes: [] },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375, state: 'Tlaxcala', variantes: [] },
  'Tampico': { lat: 22.2553, lng: -97.8686, state: 'Tamaulipas', variantes: [] },
  'Reynosa': { lat: 26.0921, lng: -98.2766, state: 'Tamaulipas', variantes: [] },
  'Matamoros': { lat: 25.8691, lng: -97.5027, state: 'Tamaulipas', variantes: [] },
}

const ESTADOS: Record<string, { lat: number; lng: number; variantes?: string[] }> = {
  'Aguascalientes': { lat: 21.8818, lng: -102.2916, variantes: ['Ags.'] },
  'Baja California': { lat: 30.8406, lng: -115.2838, variantes: ['BC', 'B.C.'] },
  'Baja California Sur': { lat: 25.0, lng: -111.3333, variantes: ['BCS'] },
  'Campeche': { lat: 19.0, lng: -90.5 },
  'Chiapas': { lat: 16.75, lng: -92.6333 },
  'Chihuahua': { lat: 28.6329, lng: -106.0691, variantes: ['Chih.'] },
  'Coahuila': { lat: 27.0, lng: -102.0, variantes: ['Coah.'] },
  'Colima': { lat: 19.2452, lng: -103.7241 },
  'Durango': { lat: 24.0277, lng: -104.6532, variantes: ['Dgo.'] },
  'Estado de México': { lat: 19.4969, lng: -99.7233, variantes: ['Edomex', 'EdoMex', 'Estado de Mexico'] },
  'Guanajuato': { lat: 21.019, lng: -101.2574, variantes: ['Gto.'] },
  'Guerrero': { lat: 17.4392, lng: -99.5451, variantes: ['Gro.'] },
  'Hidalgo': { lat: 20.1011, lng: -98.7591, variantes: ['Hgo.'] },
  'Jalisco': { lat: 20.6597, lng: -103.3496, variantes: ['Jal.'] },
  'Michoacán': { lat: 19.5665, lng: -101.7068, variantes: ['Michoacan', 'Mich.'] },
  'Morelos': { lat: 18.9242, lng: -99.2216, variantes: ['Mor.'] },
  'Nayarit': { lat: 21.7514, lng: -104.8455, variantes: ['Nay.'] },
  'Nuevo León': { lat: 25.5922, lng: -99.9962, variantes: ['Nuevo Leon', 'NL', 'N.L.'] },
  'Oaxaca': { lat: 17.0732, lng: -96.7266, variantes: ['Oax.'] },
  'Puebla': { lat: 19.0414, lng: -98.2063, variantes: ['Pue.'] },
  'Querétaro': { lat: 20.5888, lng: -100.3899, variantes: ['Queretaro', 'Qro.'] },
  'Quintana Roo': { lat: 19.1817, lng: -88.4791, variantes: ['QR', 'Q.Roo'] },
  'San Luis Potosí': { lat: 22.1565, lng: -100.9855, variantes: ['San Luis Potosi', 'SLP'] },
  'Sinaloa': { lat: 24.8091, lng: -107.394, variantes: ['Sin.'] },
  'Sonora': { lat: 29.0729, lng: -110.9559, variantes: ['Son.'] },
  'Tabasco': { lat: 17.9869, lng: -92.9303, variantes: ['Tab.'] },
  'Tamaulipas': { lat: 24.2669, lng: -98.8363, variantes: ['Tamps.'] },
  'Tlaxcala': { lat: 19.3182, lng: -98.2375, variantes: ['Tlax.'] },
  'Veracruz': { lat: 19.1738, lng: -96.1342, variantes: ['Ver.'] },
  'Yucatán': { lat: 20.9674, lng: -89.5926, variantes: ['Yucatan', 'Yuc.'] },
  'Zacatecas': { lat: 22.7709, lng: -102.5832, variantes: ['Zac.'] },
  'CDMX': { lat: 19.4326, lng: -99.1332, variantes: ['Ciudad de México', 'DF', 'D.F.', 'Distrito Federal'] },
}

function detectarUbicacion(texto: string) {
  // Paso 0: formato "Ciudad, Abrev."
  const patronFormato = /([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{2,25}),\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}\.?)\s/g
  let matchFormato
  while ((matchFormato = patronFormato.exec(texto)) !== null) {
    const ciudad = matchFormato[1].trim()
    const abrev = matchFormato[2].replace('.', '').trim()
    for (const [municipio, datos] of Object.entries(MUNICIPIOS)) {
      if (municipio.toLowerCase() === ciudad.toLowerCase() ||
          (datos.variantes ?? []).some(v => v.toLowerCase() === ciudad.toLowerCase())) {
        return { municipality: municipio, lat: datos.lat, lng: datos.lng, state: datos.state }
      }
    }
    for (const [estado, datos] of Object.entries(ESTADOS)) {
      const variantes = datos.variantes ?? []
      if (variantes.some(v => v.replace('.', '').toLowerCase() === abrev.toLowerCase())) {
        return { municipality: null, lat: datos.lat, lng: datos.lng, state: estado }
      }
    }
  }

  // Paso 1: municipio exacto o variante
  for (const [municipio, datos] of Object.entries(MUNICIPIOS)) {
    const toCheck = [municipio, ...(datos.variantes ?? [])]
    for (const variante of toCheck) {
      if (texto.includes(variante)) {
        return { municipality: municipio, lat: datos.lat, lng: datos.lng, state: datos.state }
      }
    }
  }

  // Paso 2: patrón contextual
  const patronContextual = /\b(?:en|desde|del?|municipio\s+de|ciudad\s+de)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{3,25})/g
  let match
  while ((match = patronContextual.exec(texto)) !== null) {
    const candidato = match[1].trim()
    for (const [municipio, datos] of Object.entries(MUNICIPIOS)) {
      if (municipio.toLowerCase() === candidato.toLowerCase() ||
          (datos.variantes ?? []).some(v => v.toLowerCase() === candidato.toLowerCase())) {
        return { municipality: municipio, lat: datos.lat, lng: datos.lng, state: datos.state }
      }
    }
  }

  // Paso 3: estado exacto o variante
  for (const [estado, datos] of Object.entries(ESTADOS)) {
    const toCheck = [estado, ...(datos.variantes ?? [])]
    for (const variante of toCheck) {
      if (texto.includes(variante)) {
        return { municipality: null, lat: datos.lat, lng: datos.lng, state: estado }
      }
    }
  }

  return { municipality: null, lat: null, lng: null, state: null }
}

async function backfillUbicaciones() {
  const articulos = await prisma.article.findMany({
  where: {
    OR: [
      { state: null },
      { state: '' },
      { municipality: null },
      { municipality: '' },
    ]
  },
    select: { id: true, title: true, excerpt: true, url: true, content: true },
    orderBy: { publishedAt: 'desc' },
  })

  console.log(`Artículos sin ubicación: ${articulos.length}`)
  console.log('Iniciando backfill de ubicaciones...\n')

  let actualizados = 0
  let sinUbicacion = 0

  for (const [i, art] of articulos.entries()) {
    console.log(`[${i + 1}/${articulos.length}] ${art.title.slice(0, 60)}`)

    // Usamos el contenido guardado si existe, si no hacemos fetch
    let textoAnalisis = art.title + ' ' + (art.excerpt ?? '')

    if (art.content) {
      textoAnalisis = art.title + ' ' + art.content
    } else {
      const contenido = await extraerContenidoArticulo(art.url)
      if (contenido) textoAnalisis = art.title + ' ' + contenido
      await delay(600)
    }

    const geo = detectarUbicacion(textoAnalisis)

    if (geo.state || geo.municipality) {
      await prisma.article.update({
        where: { id: art.id },
        data: {
          state: geo.state,
          municipality: geo.municipality,
          lat: geo.lat,
          lng: geo.lng,
        },
      })
      console.log(`  → ${geo.municipality ?? geo.state} ✓\n`)
      actualizados++
    } else {
      console.log(`  → sin ubicación detectada\n`)
      sinUbicacion++
    }
  }

  console.log('══════════════════════════')
  console.log(`Con ubicación nueva: ${actualizados}`)
  console.log(`Sin ubicación:       ${sinUbicacion}`)

  await prisma.$disconnect()
}

backfillUbicaciones()