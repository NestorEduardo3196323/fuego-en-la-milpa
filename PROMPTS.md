# Registro de prompts — Cortafuego: Fuego en la Milpa

Cada entrada se agrega en el momento en que se dirige al agente, según la
práctica de la Semana 2. En esta sesión el agente es Claude Code trabajando
directamente sobre el proyecto, dirigido por las decisiones de la ficha y
las instrucciones dadas en el chat.

---

## P1 — ARRANQUE · las reglas

**Prompt enviado (adaptado de la plantilla P1, con la ficha completa):**

```
Creá el archivo src/logica.ts con las reglas de Cortafuego — Fuego en la
Milpa, según la ficha del proyecto.

REGLAS TÉCNICAS, obligatorias
- TypeScript. Exportá los tipos y el objeto CONFIG con todos los números
  juntos arriba, cada uno con un comentario que diga su unidad.
- Este archivo NO puede tocar la pantalla: nada de document, window, alert
  ni console.log. Solo datos y funciones sobre el estado.
- Cada función que cambia el estado devuelve true si la acción fue válida y
  false si no se pudo hacer.
- Hace falta azar para la dirección del viento y la propagación del fuego:
  usar un generador con semilla, exportado, para que la misma semilla dé
  siempre el mismo resultado.
- Código y comentarios en español.

REGLAS DE TRABAJO
- Hacer exactamente lo que dice la ficha. Nada más.
- Si algo es ambiguo o imposible, parar y preguntar antes de inventar.
- Al terminar, listar qué se dejó fuera y qué se decidió donde la ficha no
  decía nada.

FICHA: (ver ficha-proyecto.pdf / ficha-proyecto.docx en la raíz del
proyecto — las 12 partes completas, sin firmas)
```

**Qué hizo el agente:** generó `src/logica.ts` con `CONFIG` (tamaño de
grilla, cortafuegos iniciales, % de victoria, probabilidades de propagación
a favor del viento y lateral), los tipos `TipoCelda`, `Direccion`,
`EstadoJuego`, un generador de aleatorios con semilla (`mulberry32`), y las
funciones `crearEstadoInicial`, `cortarCelda`, `avanzarTurno` y
`calcularPorcentajeSalvado`. Compiló limpio con `npx tsc --noEmit`.

**Decisiones que no estaban en la ficha (quedan declaradas acá, no
inventadas en silencio):**
- La celda donde arranca el fuego es la esquina/borde opuesto a hacia
  donde sopla el viento (no lo decía la ficha explícitamente).
- "Termina mal" se interpretó como dos casos: el fuego llega al borde
  opuesto del grid (derrota inmediata), o el fuego se autoconsume pero
  salvó menos del 60%.
- La propagación lateral (diagonal al viento) usa una probabilidad menor
  (30%) que la propagación a favor del viento (90%), para que un
  cortafuego perpendicular al viento sea una estrategia real.

---

## P2 — PRUEBAS · que la máquina revise

**Prompt enviado (plantilla P2):**

```
Escribí pruebas con Vitest para src/logica.ts, en test/logica.test.ts.

Como mínimo cinco, y tienen que cubrir:
1. Que el estado inicial se arme bien.
2. Cada acción del usuario: qué hace cuando es válida y qué devuelve cuando no.
3. Que no se pueda hacer una acción prohibida por las reglas.
4. La condición de «termina bien» y la de «termina mal» de mi ficha.
5. UNA PRUEBA QUE RECORRA UN USO COMPLETO de principio a fin y compruebe que
   SE PUEDE LLEGAR AL FINAL BUENO.

Los nombres de las pruebas en español y en forma de frase.
No modifiques src/logica.ts. Al terminar corré npm test y pegame el resultado.
```

**Qué hizo el agente:** generó `test/logica.test.ts` con 12 pruebas
(supera el mínimo de 5), agrupadas en: estado inicial, `cortarCelda`,
`avanzarTurno`, condición de victoria/derrota, y un recorrido completo.
Resultado real de `npm test`:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

No hizo falta corregir nada en `src/logica.ts`: las 12 pasaron al primer
intento.
