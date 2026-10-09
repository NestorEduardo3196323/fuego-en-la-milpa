// Reglas de "Cortafuego — Fuego en la Milpa".
// Este archivo no toca la pantalla: solo datos y funciones sobre el estado.

export const CONFIG = {
  TAMANO_GRID: 12, // celdas por lado de la cuadrícula
  CORTAFUEGOS_INICIALES: 8, // cantidad de cortes disponibles al empezar
  PORCENTAJE_VICTORIA: 60, // % de milpa que hay que salvar para ganar
  PROB_PROPAGACION_VIENTO: 0.9, // probabilidad de que el fuego avance a favor del viento
  PROB_PROPAGACION_LATERAL: 0.3, // probabilidad de que avance en diagonal al viento
}

export type TipoCelda = 'sano' | 'fuego' | 'quemado' | 'cortafuego'

export type Direccion =
  | 'norte' | 'noreste' | 'este' | 'sureste'
  | 'sur' | 'suroeste' | 'oeste' | 'noroeste'

export interface Celda {
  fila: number
  columna: number
}

export interface EstadoJuego {
  grid: TipoCelda[][]
  direccionViento: Direccion
  cortafuegosRestantes: number
  turno: number
  estadoPartida: 'jugando' | 'ganado' | 'perdido'
  semilla: number
}

// Delta de fila/columna que empuja el viento en cada dirección.
export const VECTOR_DIRECCION: Record<Direccion, { df: number; dc: number }> = {
  norte: { df: -1, dc: 0 },
  noreste: { df: -1, dc: 1 },
  este: { df: 0, dc: 1 },
  sureste: { df: 1, dc: 1 },
  sur: { df: 1, dc: 0 },
  suroeste: { df: 1, dc: -1 },
  oeste: { df: 0, dc: -1 },
  noroeste: { df: -1, dc: -1 },
}

const ORDEN_DIRECCIONES: Direccion[] = [
  'norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste',
]

// Generador con semilla (mulberry32): misma semilla, mismo resultado siempre.
export function crearGeneradorAleatorio(semilla: number): () => number {
  let estadoInterno = semilla >>> 0
  return function siguiente(): number {
    estadoInterno |= 0
    estadoInterno = (estadoInterno + 0x6d2b79f5) | 0
    let t = Math.imul(estadoInterno ^ (estadoInterno >>> 15), 1 | estadoInterno)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function direccionDesdeIndice(indice: number): Direccion {
  const n = ORDEN_DIRECCIONES.length
  // En JS el resto de un número negativo conserva el signo (-1 % 8 === -1),
  // así que hay que sumarle n antes de volver a aplicar el módulo.
  return ORDEN_DIRECCIONES[((indice % n) + n) % n]
}

// Las dos direcciones a 45° de la dirección del viento (propagación lateral).
function direccionesLaterales(direccion: Direccion): [Direccion, Direccion] {
  const i = ORDEN_DIRECCIONES.indexOf(direccion)
  return [direccionDesdeIndice(i - 1), direccionDesdeIndice(i + 1)]
}

function enRango(fila: number, columna: number): boolean {
  return fila >= 0 && fila < CONFIG.TAMANO_GRID && columna >= 0 && columna < CONFIG.TAMANO_GRID
}

// Celda donde arranca el incendio: el extremo opuesto hacia donde empuja el viento.
function celdaOrigenFuego(direccion: Direccion): Celda {
  const { df, dc } = VECTOR_DIRECCION[direccion]
  const mitad = Math.floor(CONFIG.TAMANO_GRID / 2)
  const fila = df === 1 ? CONFIG.TAMANO_GRID - 1 : df === -1 ? 0 : mitad
  const columna = dc === 1 ? CONFIG.TAMANO_GRID - 1 : dc === -1 ? 0 : mitad
  return { fila, columna }
}

export function crearEstadoInicial(semilla: number): EstadoJuego {
  const rng = crearGeneradorAleatorio(semilla)
  const indiceDireccion = Math.floor(rng() * ORDEN_DIRECCIONES.length)
  const direccionViento = direccionDesdeIndice(indiceDireccion)

  const grid: TipoCelda[][] = []
  for (let fila = 0; fila < CONFIG.TAMANO_GRID; fila++) {
    grid.push(new Array(CONFIG.TAMANO_GRID).fill('sano'))
  }

  const origen = celdaOrigenFuego(direccionViento)
  grid[origen.fila][origen.columna] = 'fuego'

  return {
    grid,
    direccionViento,
    cortafuegosRestantes: CONFIG.CORTAFUEGOS_INICIALES,
    turno: 0,
    estadoPartida: 'jugando',
    semilla,
  }
}

// Corta una celda sana y la convierte en cortafuego. Devuelve si la acción fue válida.
export function cortarCelda(estado: EstadoJuego, fila: number, columna: number): boolean {
  if (estado.estadoPartida !== 'jugando') return false
  if (!enRango(fila, columna)) return false
  if (estado.cortafuegosRestantes <= 0) return false
  if (estado.grid[fila][columna] !== 'sano') return false

  estado.grid[fila][columna] = 'cortafuego'
  estado.cortafuegosRestantes -= 1
  return true
}

export function calcularPorcentajeSalvado(estado: EstadoJuego): number {
  const total = CONFIG.TAMANO_GRID * CONFIG.TAMANO_GRID
  let salvadas = 0
  for (const fila of estado.grid) {
    for (const celda of fila) {
      if (celda === 'sano' || celda === 'cortafuego') salvadas += 1
    }
  }
  return (salvadas / total) * 100
}

function fuegoLlegoAlBordeOpuesto(estado: EstadoJuego): boolean {
  const { df, dc } = VECTOR_DIRECCION[estado.direccionViento]
  const filaLimite = df === 1 ? CONFIG.TAMANO_GRID - 1 : df === -1 ? 0 : null
  const columnaLimite = dc === 1 ? CONFIG.TAMANO_GRID - 1 : dc === -1 ? 0 : null

  for (let fila = 0; fila < CONFIG.TAMANO_GRID; fila++) {
    for (let columna = 0; columna < CONFIG.TAMANO_GRID; columna++) {
      if (estado.grid[fila][columna] !== 'fuego') continue
      if (filaLimite !== null && fila === filaLimite) return true
      if (columnaLimite !== null && columna === columnaLimite) return true
    }
  }
  return false
}

// Propaga el fuego un paso. Devuelve si el turno se pudo avanzar.
export function avanzarTurno(estado: EstadoJuego): boolean {
  if (estado.estadoPartida !== 'jugando') return false

  const rng = crearGeneradorAleatorio(estado.semilla + estado.turno + 1)
  const [lateralA, lateralB] = direccionesLaterales(estado.direccionViento)
  const celdasEnFuego: Celda[] = []

  for (let fila = 0; fila < CONFIG.TAMANO_GRID; fila++) {
    for (let columna = 0; columna < CONFIG.TAMANO_GRID; columna++) {
      if (estado.grid[fila][columna] === 'fuego') celdasEnFuego.push({ fila, columna })
    }
  }

  const nuevasEnFuego: Celda[] = []
  for (const celda of celdasEnFuego) {
    const candidatos: Array<{ direccion: Direccion; probabilidad: number }> = [
      { direccion: estado.direccionViento, probabilidad: CONFIG.PROB_PROPAGACION_VIENTO },
      { direccion: lateralA, probabilidad: CONFIG.PROB_PROPAGACION_LATERAL },
      { direccion: lateralB, probabilidad: CONFIG.PROB_PROPAGACION_LATERAL },
    ]
    for (const { direccion, probabilidad } of candidatos) {
      const { df, dc } = VECTOR_DIRECCION[direccion]
      const filaVecina = celda.fila + df
      const columnaVecina = celda.columna + dc
      if (!enRango(filaVecina, columnaVecina)) continue
      if (estado.grid[filaVecina][columnaVecina] !== 'sano') continue
      if (rng() < probabilidad) nuevasEnFuego.push({ fila: filaVecina, columna: columnaVecina })
    }
  }

  // Lo que estaba en llamas se consume; lo nuevo empieza a arder.
  for (const celda of celdasEnFuego) estado.grid[celda.fila][celda.columna] = 'quemado'
  for (const celda of nuevasEnFuego) estado.grid[celda.fila][celda.columna] = 'fuego'

  estado.turno += 1

  if (fuegoLlegoAlBordeOpuesto(estado)) {
    estado.estadoPartida = 'perdido'
    return true
  }

  const quedaFuego = estado.grid.some((fila) => fila.some((c) => c === 'fuego'))
  if (!quedaFuego) {
    const salvado = calcularPorcentajeSalvado(estado)
    estado.estadoPartida = salvado >= CONFIG.PORCENTAJE_VICTORIA ? 'ganado' : 'perdido'
  }

  return true
}
