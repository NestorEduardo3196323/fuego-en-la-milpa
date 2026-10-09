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
let seleccion = { fila: 0, columna: 0 }

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header>
    <h1>Cortafuego — Fuego en la Milpa</h1>
    <p>El fuego avanza con el viento. Construí cortafuegos antes de que llegue.</p>
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
    <div class="tablero" id="tablero" style="--tamano:${CONFIG.TAMANO_GRID}"></div>
  </div>

  <div class="controles">
    <button type="button" class="accion" id="btn-avanzar">Avanzar turno (espacio)</button>
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

  <p class="ayuda">Tocá una celda para cortarla. Con teclado: flechas para moverte,
  Enter para cortar la celda seleccionada.</p>
`

const elTablero = document.querySelector<HTMLDivElement>('#tablero')!
const elResultado = document.querySelector<HTMLDivElement>('#resultado')!
const elHudViento = document.querySelector<HTMLSpanElement>('#hud-viento')!
const elHudCortafuegos = document.querySelector<HTMLSpanElement>('#hud-cortafuegos')!
const elHudTurno = document.querySelector<HTMLSpanElement>('#hud-turno')!
const elHudSalvado = document.querySelector<HTMLSpanElement>('#hud-salvado')!
const elHudRecord = document.querySelector<HTMLSpanElement>('#hud-record')!
const elAvisoViento = document.querySelector<HTMLParagraphElement>('#aviso-viento')!
const btnAvanzar = document.querySelector<HTMLButtonElement>('#btn-avanzar')!
const btnReiniciar = document.querySelector<HTMLButtonElement>('#btn-reiniciar')!

function nombreDireccion(direccion: Direccion): string {
  return direccion.charAt(0).toUpperCase() + direccion.slice(1)
}

function dibujar(): void {
  elTablero.innerHTML = ''
  for (let fila = 0; fila < CONFIG.TAMANO_GRID; fila++) {
    for (let columna = 0; columna < CONFIG.TAMANO_GRID; columna++) {
      const tipo = estado.grid[fila][columna]
      const celda = document.createElement('button')
      celda.type = 'button'
      celda.className = `celda ${tipo}`
      if (fila === seleccion.fila && columna === seleccion.columna) {
        celda.classList.add('seleccionada')
      }
      const esAldea = estado.aldea.some((c) => c.fila === fila && c.columna === columna)
      if (esAldea) celda.classList.add('aldea')
      const etiquetaAldea = esAldea ? ', con una casa de la aldea' : ''
      celda.setAttribute('aria-label', `Celda fila ${fila + 1}, columna ${columna + 1}: ${tipo}${etiquetaAldea}`)
      celda.disabled = estado.estadoPartida !== 'jugando'
      celda.addEventListener('click', () => {
        seleccion = { fila, columna }
        intentarCortar(fila, columna)
      })
      elTablero.appendChild(celda)
    }
  }

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

  btnAvanzar.disabled = estado.estadoPartida !== 'jugando'
}

function intentarCortar(fila: number, columna: number): void {
  cortarCelda(estado, fila, columna)
  dibujar()
}

function intentarAvanzar(): void {
  avanzarTurno(estado)
  registrarResultadoSiTermino()
  dibujar()
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

function reiniciar(): void {
  estado = crearEstadoInicial(Date.now())
  seleccion = { fila: 0, columna: 0 }
  resultadoYaRegistrado = false
  esNuevoRecord = false
  dibujar()
}

btnAvanzar.addEventListener('click', intentarAvanzar)
btnReiniciar.addEventListener('click', reiniciar)

window.addEventListener('keydown', (evento) => {
  const teclasQueControlanElJuego = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'r', 'R']
  if (teclasQueControlanElJuego.includes(evento.key)) evento.preventDefault()

  switch (evento.key) {
    case 'ArrowUp':
      seleccion.fila = Math.max(0, seleccion.fila - 1)
      dibujar()
      break
    case 'ArrowDown':
      seleccion.fila = Math.min(CONFIG.TAMANO_GRID - 1, seleccion.fila + 1)
      dibujar()
      break
    case 'ArrowLeft':
      seleccion.columna = Math.max(0, seleccion.columna - 1)
      dibujar()
      break
    case 'ArrowRight':
      seleccion.columna = Math.min(CONFIG.TAMANO_GRID - 1, seleccion.columna + 1)
      dibujar()
      break
    case 'Enter':
      intentarCortar(seleccion.fila, seleccion.columna)
      break
    case ' ':
      intentarAvanzar()
      break
    case 'r':
    case 'R':
      reiniciar()
      break
  }
})

dibujar()
