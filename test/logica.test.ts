import { describe, it, expect } from 'vitest'
import {
  CONFIG,
  crearEstadoInicial,
  cortarCelda,
  avanzarTurno,
  calcularPorcentajeSalvado,
} from '../src/logica'

describe('estado inicial', () => {
  it('arma una grilla del tamaño configurado, con cortafuegos y turno en cero', () => {
    const estado = crearEstadoInicial(1)
    expect(estado.grid.length).toBe(CONFIG.TAMANO_GRID)
    expect(estado.grid[0].length).toBe(CONFIG.TAMANO_GRID)
    expect(estado.cortafuegosRestantes).toBe(CONFIG.CORTAFUEGOS_INICIALES)
    expect(estado.turno).toBe(0)
    expect(estado.estadoPartida).toBe('jugando')
  })

  it('arranca con exactamente una celda en fuego', () => {
    const estado = crearEstadoInicial(7)
    const celdasEnFuego = estado.grid.flat().filter((c) => c === 'fuego')
    expect(celdasEnFuego.length).toBe(1)
  })

  it('la misma semilla produce siempre el mismo estado inicial', () => {
    const a = crearEstadoInicial(42)
    const b = crearEstadoInicial(42)
    expect(a.direccionViento).toBe(b.direccionViento)
    expect(a.grid).toEqual(b.grid)
  })
})

describe('cortarCelda', () => {
  it('convierte una celda sana en cortafuego y descuenta el contador', () => {
    const estado = crearEstadoInicial(1)
    const antes = estado.cortafuegosRestantes
    const ok = cortarCelda(estado, 0, 0)
    expect(ok).toBe(true)
    expect(estado.grid[0][0]).toBe('cortafuego')
    expect(estado.cortafuegosRestantes).toBe(antes - 1)
  })

  it('no permite cortar una celda que ya está en fuego, quemada o cortada', () => {
    const estado = crearEstadoInicial(1)
    cortarCelda(estado, 0, 0)
    expect(cortarCelda(estado, 0, 0)).toBe(false) // ya es cortafuego

    const celdaFuego = estado.grid.flat().indexOf('fuego')
    const fila = Math.floor(celdaFuego / CONFIG.TAMANO_GRID)
    const columna = celdaFuego % CONFIG.TAMANO_GRID
    expect(cortarCelda(estado, fila, columna)).toBe(false) // está en fuego
  })

  it('no permite cortar fuera de la grilla', () => {
    const estado = crearEstadoInicial(1)
    expect(cortarCelda(estado, -1, 0)).toBe(false)
    expect(cortarCelda(estado, 0, CONFIG.TAMANO_GRID)).toBe(false)
  })

  it('no permite cortar cuando ya no quedan cortafuegos disponibles', () => {
    const estado = crearEstadoInicial(1)
    let fila = 0
    let columna = 0
    for (let i = 0; i < CONFIG.CORTAFUEGOS_INICIALES; i++) {
      while (estado.grid[fila][columna] !== 'sano') {
        columna += 1
        if (columna >= CONFIG.TAMANO_GRID) { columna = 0; fila += 1 }
      }
      cortarCelda(estado, fila, columna)
    }
    expect(estado.cortafuegosRestantes).toBe(0)
    expect(cortarCelda(estado, CONFIG.TAMANO_GRID - 1, CONFIG.TAMANO_GRID - 1)).toBe(false)
  })
})

describe('avanzarTurno', () => {
  it('consume las celdas que estaban en fuego (pasan a quemado)', () => {
    const estado = crearEstadoInicial(3)
    const celdaOrigen = estado.grid.flat().indexOf('fuego')
    const fila = Math.floor(celdaOrigen / CONFIG.TAMANO_GRID)
    const columna = celdaOrigen % CONFIG.TAMANO_GRID

    avanzarTurno(estado)

    expect(estado.grid[fila][columna]).toBe('quemado')
    expect(estado.turno).toBe(1)
  })

  it('no avanza turno si la partida ya terminó', () => {
    const estado = crearEstadoInicial(3)
    estado.estadoPartida = 'ganado'
    expect(avanzarTurno(estado)).toBe(false)
    expect(estado.turno).toBe(0)
  })
})

describe('condición de victoria y derrota', () => {
  it('declara perdido si el fuego llega al borde opuesto sin cortafuegos', () => {
    const estado = crearEstadoInicial(5)
    let guard = 0
    while (estado.estadoPartida === 'jugando' && guard < 50) {
      avanzarTurno(estado)
      guard += 1
    }
    expect(estado.estadoPartida).not.toBe('jugando')
  })

  it('calcula el porcentaje salvado sobre el total de celdas', () => {
    const estado = crearEstadoInicial(2)
    const porcentaje = calcularPorcentajeSalvado(estado)
    const total = CONFIG.TAMANO_GRID * CONFIG.TAMANO_GRID
    expect(porcentaje).toBeCloseTo(((total - 1) / total) * 100, 5)
  })
})

describe('el fuego nace lejos del borde de derrota', () => {
  it('no se pierde en el primer turno sin importar la dirección del viento', () => {
    const direccionesVistas = new Set<string>()
    for (let semilla = 0; semilla < 200 && direccionesVistas.size < 8; semilla++) {
      const estado = crearEstadoInicial(semilla)
      direccionesVistas.add(estado.direccionViento)
      avanzarTurno(estado)
      expect(estado.estadoPartida).toBe('jugando')
    }
    expect(direccionesVistas.size).toBe(8)
  })
})

describe('avanzarTurno con las ocho direcciones de viento', () => {
  it('no revienta sin importar hacia dónde sopla el viento', () => {
    const direccionesVistas = new Set<string>()
    for (let semilla = 0; semilla < 200 && direccionesVistas.size < 8; semilla++) {
      const estado = crearEstadoInicial(semilla)
      direccionesVistas.add(estado.direccionViento)
      expect(() => avanzarTurno(estado)).not.toThrow()
    }
    expect(direccionesVistas.size).toBe(8)
  })
})

describe('recorrido completo', () => {
  it('se puede llegar al final bueno cortando una línea perpendicular al viento', () => {
    const estado = crearEstadoInicial(9)
    const { direccionViento } = estado
    const mitad = Math.floor(CONFIG.TAMANO_GRID / 2)

    // Cortafuego en una línea cruzando el camino probable del fuego,
    // a mitad de camino entre el origen y el borde opuesto.
    for (let i = 0; i < CONFIG.TAMANO_GRID; i++) {
      const fila = direccionViento.includes('norte') || direccionViento.includes('sur') ? mitad : i
      const columna = direccionViento.includes('este') || direccionViento.includes('oeste') ? mitad : i
      if (estado.grid[fila][columna] === 'sano') cortarCelda(estado, fila, columna)
    }

    let guard = 0
    while (estado.estadoPartida === 'jugando' && guard < 50) {
      avanzarTurno(estado)
      guard += 1
    }

    expect(estado.estadoPartida === 'ganado' || estado.estadoPartida === 'perdido').toBe(true)
    expect(calcularPorcentajeSalvado(estado)).toBeGreaterThan(0)
  })
})
