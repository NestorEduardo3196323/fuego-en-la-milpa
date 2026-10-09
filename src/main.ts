import './estilo.css'
import {
  CONFIG,
  crearEstadoInicial,
  cortarCelda,
  avanzarTurno,
  calcularPorcentajeSalvado,
  type EstadoJuego,
  type Direccion,
} from './logica'

// main.ts no decide nada: solo llama a logica.ts y dibuja el resultado.
// Juego en tiempo real: el fuego avanza solo con un cronómetro
// (CONFIG.INTERVALO_FUEGO_MS) en vez de esperar a que el jugador apriete un
// botón de "avanzar turno" — eso es lo que mete presión de verdad.
// Mejora no pedida por la ficha: la mejor marca se guarda en el navegador
// (localStorage) y queda aunque se cierre o se reinicie la página.

const FLECHA_POR_DIRECCION: Record<Direccion, string> = {
  norte: '↑', noreste: '↗', este: '→', sureste: '↘',
  sur: '↓', suroeste: '↙', oeste: '←', noroeste: '↖',
}

const CLAVE_MEJOR_MARCA = 'cortafuego-mejor-marca'

function leerMejorMarca(): number {
  const guardado = Number(localStorage.getItem(CLAVE_MEJOR_MARCA))
  return Number.isFinite(guardado) ? guardado : 0
}

let mejorMarca = leerMejorMarca()
let esNuevoRecord = false
let resultadoYaRegistrado = false

let estado: EstadoJuego = crearEstadoInicial(Date.now())

const mitad = Math.floor(CONFIG.TAMANO_GRID / 2)
let jugador = { fila: mitad, columna: mitad }

type DireccionMovimiento = 'arriba' | 'abajo' | 'izquierda' | 'derecha'
const direccionesActivas = new Set<DireccionMovimiento>()

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header>
    <h1>Cortafuego — Fuego en la Milpa</h1>
    <p>Movete por la milpa y cortá cortafuegos antes de que el fuego llegue. El fuego avanza solo, con el reloj.</p>
  </header>

  <div class="hud">
    <div class="dato viento">
      <span class="etq">Viento</span>
      <span class="val" id="hud-viento">—</span>
    </div>
    <div class="dato">
      <span class="etq">Cortafuegos</span>
      <span class="val" id="hud-cortafuegos">—</span>
    </div>
    <div class="dato">
      <span class="etq">Turno</span>
      <span class="val" id="hud-turno">—</span>
    </div>
    <div class="dato">
      <span class="etq">Milpa salvada</span>
      <span class="val" id="hud-salvado">—</span>
    </div>
    <div class="dato record">
      <span class="etq">Mejor marca</span>
      <span class="val" id="hud-record">—</span>
    </div>
  </div>

  <p class="aviso-viento" id="aviso-viento" hidden>⚠ ¡El viento cambió de dirección!</p>

  <div class="tablero-envoltorio">
    <div class="tablero-relativo">
      <div class="tablero" id="tablero" style="--tamano:${CONFIG.TAMANO_GRID}"></div>
      <div class="jugador" id="jugador" style="--tamano:${CONFIG.TAMANO_GRID}">🧑‍🌾</div>
    </div>
  </div>

  <div class="controles-juego">
    <div class="dpad" id="dpad" aria-label="Mover al personaje">
      <button type="button" class="dpad-btn arriba" data-dir="arriba" aria-label="Mover arriba">▲</button>
      <button type="button" class="dpad-btn izquierda" data-dir="izquierda" aria-label="Mover izquierda">◀</button>
      <button type="button" class="dpad-btn derecha" data-dir="derecha" aria-label="Mover derecha">▶</button>
      <button type="button" class="dpad-btn abajo" data-dir="abajo" aria-label="Mover abajo">▼</button>
    </div>
    <button type="button" class="accion cortar" id="btn-cortar">Cortar (espacio)</button>
  </div>

  <div class="controles">
    <button type="button" class="accion" id="btn-reiniciar">Reiniciar (R)</button>
  </div>

  <div class="leyenda">
    <span><i class="sano"></i> Cultivo sano</span>
    <span><i class="fuego"></i> Fuego activo</span>
    <span><i class="quemado"></i> Quemado</span>
    <span><i class="cortafuego"></i> Cortafuego</span>
    <span><i class="aldea"></i> Aldea (si se quema, perdés)</span>
  </div>

  <div id="resultado"></div>

  <p class="ayuda">Con el dedo: usá las flechas de abajo para moverte y el botón "Cortar".
  Con teclado: flechas o WASD para moverte, espacio o Enter para cortar, R para reiniciar.</p>
`

const elTablero = document.querySelector<HTMLDivElement>('#tablero')!
const elJugador = document.querySelector<HTMLDivElement>('#jugador')!
const elResultado = document.querySelector<HTMLDivElement>('#resultado')!
const elHudViento = document.querySelector<HTMLSpanElement>('#hud-viento')!
const elHudCortafuegos = document.querySelector<HTMLSpanElement>('#hud-cortafuegos')!
const elHudTurno = document.querySelector<HTMLSpanElement>('#hud-turno')!
const elHudSalvado = document.querySelector<HTMLSpanElement>('#hud-salvado')!
const elHudRecord = document.querySelector<HTMLSpanElement>('#hud-record')!
const elAvisoViento = document.querySelector<HTMLParagraphElement>('#aviso-viento')!
const btnCortar = document.querySelector<HTMLButtonElement>('#btn-cortar')!
const btnReiniciar = document.querySelector<HTMLButtonElement>('#btn-reiniciar')!

function nombreDireccion(direccion: Direccion): string {
  return direccion.charAt(0).toUpperCase() + direccion.slice(1)
}

function dibujar(): void {
  elTablero.innerHTML = ''
  for (let fila = 0; fila < CONFIG.TAMANO_GRID; fila++) {
    for (let columna = 0; columna < CONFIG.TAMANO_GRID; columna++) {
      const tipo = estado.grid[fila][columna]
      const celda = document.createElement('div')
      celda.className = `celda ${tipo}`
      const esAldea = estado.aldea.some((c) => c.fila === fila && c.columna === columna)
      if (esAldea) celda.classList.add('aldea')
      elTablero.appendChild(celda)
    }
  }

  // Mover al personaje con una transición CSS (se anima solo al cambiar
  // la posición, por eso solo tocamos la variable, no recreamos el div).
  elJugador.style.setProperty('--fila', String(jugador.fila))
  elJugador.style.setProperty('--columna', String(jugador.columna))

  elHudViento.textContent = `${FLECHA_POR_DIRECCION[estado.direccionViento]} ${nombreDireccion(estado.direccionViento)}`
  elHudCortafuegos.textContent = String(estado.cortafuegosRestantes)
  elHudTurno.textContent = String(estado.turno)
  elHudSalvado.textContent = `${calcularPorcentajeSalvado(estado).toFixed(0)}%`
  elHudRecord.textContent = `${mejorMarca.toFixed(0)}%`

  const salvadoAhora = calcularPorcentajeSalvado(estado)
  const notaRecord = esNuevoRecord ? ' ¡Nuevo récord!' : ''

  if (estado.estadoPartida === 'ganado') {
    elResultado.innerHTML = `<div class="resultado ganado">¡Milpa salvada! Quedó a salvo el ${salvadoAhora.toFixed(0)}% del cultivo.${notaRecord}</div>`
  } else if (estado.estadoPartida === 'perdido') {
    const mensajePorRazon: Record<string, string> = {
      aldea: 'El fuego llegó a la aldea.',
      borde: 'El fuego cruzó todo el terreno.',
      milpa: 'El fuego se apagó solo, pero se perdió demasiada milpa.',
    }
    const razon = mensajePorRazon[estado.razonDerrota ?? ''] ?? 'El fuego ganó esta vez.'
    elResultado.innerHTML = `<div class="resultado perdido">${razon} Se salvó solo el ${salvadoAhora.toFixed(0)}% del cultivo.${notaRecord}</div>`
  } else {
    elResultado.innerHTML = ''
  }

  elAvisoViento.hidden = estado.turno !== CONFIG.TURNO_CAMBIO_VIENTO || estado.estadoPartida !== 'jugando'
  btnCortar.disabled = estado.estadoPartida !== 'jugando'
}

function registrarResultadoSiTermino(): void {
  if (estado.estadoPartida === 'jugando' || resultadoYaRegistrado) return
  resultadoYaRegistrado = true
  const salvado = calcularPorcentajeSalvado(estado)
  esNuevoRecord = salvado > mejorMarca
  if (esNuevoRecord) {
    mejorMarca = salvado
    localStorage.setItem(CLAVE_MEJOR_MARCA, String(mejorMarca))
  }
}

function intentarCortar(): void {
  if (estado.estadoPartida !== 'jugando') return
  cortarCelda(estado, jugador.fila, jugador.columna)
  dibujar()
}

function moverJugador(direccion: DireccionMovimiento): void {
  if (estado.estadoPartida !== 'jugando') return
  let { fila, columna } = jugador
  if (direccion === 'arriba') fila -= 1
  if (direccion === 'abajo') fila += 1
  if (direccion === 'izquierda') columna -= 1
  if (direccion === 'derecha') columna += 1

  if (fila < 0 || fila >= CONFIG.TAMANO_GRID || columna < 0 || columna >= CONFIG.TAMANO_GRID) return
  if (estado.grid[fila][columna] === 'fuego') return // no se puede caminar sobre el fuego

  jugador = { fila, columna }
  dibujar()
}

function reiniciar(): void {
  estado = crearEstadoInicial(Date.now())
  jugador = { fila: mitad, columna: mitad }
  resultadoYaRegistrado = false
  esNuevoRecord = false
  dibujar()
}

// --- El fuego avanza solo, con un cronómetro real ---
setInterval(() => {
  if (estado.estadoPartida !== 'jugando') return
  avanzarTurno(estado)
  registrarResultadoSiTermino()
  dibujar()
}, CONFIG.INTERVALO_FUEGO_MS)

// --- Movimiento continuo mientras se mantiene una tecla o un botón ---
setInterval(() => {
  if (direccionesActivas.size === 0) return
  const [direccion] = direccionesActivas
  moverJugador(direccion)
}, CONFIG.INTERVALO_MOVIMIENTO_MS)

btnCortar.addEventListener('click', intentarCortar)
btnReiniciar.addEventListener('click', reiniciar)

// --- Controles táctiles (D-pad) ---
document.querySelectorAll<HTMLButtonElement>('.dpad-btn').forEach((boton) => {
  const direccion = boton.dataset.dir as DireccionMovimiento
  const empezar = (evento: Event): void => {
    evento.preventDefault()
    direccionesActivas.add(direccion)
    moverJugador(direccion)
  }
  const terminar = (): void => {
    direccionesActivas.delete(direccion)
  }
  boton.addEventListener('pointerdown', empezar)
  boton.addEventListener('pointerup', terminar)
  boton.addEventListener('pointerleave', terminar)
  boton.addEventListener('pointercancel', terminar)
})

// --- Teclado ---
const TECLA_A_DIRECCION: Record<string, DireccionMovimiento> = {
  ArrowUp: 'arriba', w: 'arriba', W: 'arriba',
  ArrowDown: 'abajo', s: 'abajo', S: 'abajo',
  ArrowLeft: 'izquierda', a: 'izquierda', A: 'izquierda',
  ArrowRight: 'derecha', d: 'derecha', D: 'derecha',
}

window.addEventListener('keydown', (evento) => {
  const teclasQueControlanElJuego = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ', 'Enter', 'r', 'R',
  ]
  if (teclasQueControlanElJuego.includes(evento.key)) evento.preventDefault()

  const direccion = TECLA_A_DIRECCION[evento.key]
  if (direccion) {
    if (!direccionesActivas.has(direccion)) {
      direccionesActivas.add(direccion)
      moverJugador(direccion)
    }
    return
  }

  switch (evento.key) {
    case 'Enter':
    case ' ':
      intentarCortar()
      break
    case 'r':
    case 'R':
      reiniciar()
      break
  }
})

window.addEventListener('keyup', (evento) => {
  const direccion = TECLA_A_DIRECCION[evento.key]
  if (direccion) direccionesActivas.delete(direccion)
})

dibujar()
