# Cortafuego — Fuego en la Milpa

Una simulación donde el fuego avanza sobre una milpa empujado por el viento, y el jugador construye cortafuegos a tiempo para salvar la mayor parte posible del cultivo.

## Qué hace y cómo se usa

El viento empuja el fuego en una dirección fija durante toda la partida, mostrada con una flecha. Tocás (o seleccionás con el teclado) celdas sanas para convertirlas en cortafuegos antes de que el fuego llegue, y presionás "Avanzar turno" para dejar que el fuego se propague un paso. Ganás si el fuego se apaga solo habiendo salvado el 60% o más de la milpa; perdés si el fuego llega al borde opuesto del terreno.

## Enlace para abrirlo

https://nestoreduardo3196323.github.io/fuego-en-la-milpa/

## Cómo correrlo en otra máquina

```bash
git clone https://github.com/NestorEduardo3196323/fuego-en-la-milpa.git
cd fuego-en-la-milpa
npm install
npm run dev      # servidor de desarrollo
npm test         # corre las 15 pruebas con Vitest
npm run build    # genera la versión de producción en dist/
```

Requiere Node.js (LTS) y npm.

## Qué dirigí yo y qué error encontré probando

Arranqué escribiendo mi ficha a mano (nombre, los tres verbos, cuándo se gana y se pierde, criterio de aceptación) antes de tocar la computadora. A partir de esa ficha fui dirigiendo al agente con los ocho prompts de la práctica, en orden, uno por mensaje:

- Con el **prompt P1** le pedí la lógica del juego (`src/logica.ts`) basada en mi ficha: el estado del tablero, la dirección del viento, cortar cortafuegos y avanzar turno.
- Con el **P2** le pedí las pruebas con Vitest. Pasaron todas a la primera.
- Con el **P3** le pedí la pantalla (`src/main.ts` y `src/estilo.css`). Acá probé el juego en el navegador y **encontré un error real**: cuando el viento soplaba justo hacia el norte, el juego se rompía apenas tocaba "Avanzar turno" (un error de cálculo con números negativos en JavaScript). Lo hicimos corregir y agregamos una prueba para que no volviera a pasar.
- Con el **P4** le pedí que funcionara bien en celular. Ahí encontré **otro error real, más grave**: el fuego nacía pegado al borde por el que se pierde, así que perdía la partida en el primer turno sin importar lo que cortara. También noté que el tablero original (12×12) no entraba completo en la pantalla de un celular respetando el mínimo de 44 píxeles por celda, así que lo achicamos a 7×7.
- Con el **P5** le pedí que revisara el proyecto buscando problemas típicos. Encontró que mi prueba de "se puede ganar" en realidad no comprobaba nada de verdad (aceptaba cualquier resultado); la reescribimos para que exigiera específicamente llegar a "ganado".
- Con el **P6** le pedí este README.

En resumen: el error más importante que encontré fue que el fuego arrancaba ya tocando el borde de derrota, lo que hacía el juego imposible de ganar sin importar la estrategia — lo descubrí jugándolo yo mismo, no leyendo el código.

## Declaración de autoría

Este proyecto lo construí usando **Copilot** (un agente de IA) como herramienta. El código de `src/logica.ts`, `src/main.ts`, `src/estilo.css` y las pruebas de `test/logica.test.ts` los generó el agente, pero bajo mi dirección: a partir de la ficha que escribí a mano y de los prompts que fui mandando en el orden que indica la práctica (todos quedan registrados en `PROMPTS.md`).

Puedo explicar sin problema: qué hace cada función de `logica.ts` (por qué el fuego nace en un extremo y no en otro, cómo se decide si gano o pierdo, para qué sirve la semilla del generador aleatorio), por qué separamos la lógica de la pantalla, y los dos errores reales que encontré probando el juego y cómo se corrigieron.
