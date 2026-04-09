import { calcularFidelidad } from './src/lib/fidelity'

const result = calcularFidelidad(
  'El presidente Claudia Sheinbaum confirmó que según la Secretaría de Salud, más de 500 mil personas fueron atendidas en 2025',
  'De acuerdo con datos del IMSS, el programa benefició a familias de bajos recursos. Sin embargo, la oposición rechazó las cifras presentadas.'
)

console.log(JSON.stringify(result, null, 2))