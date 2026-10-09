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

_(Para completar a mano: qué le pediste al agente en cada paso, y al menos un error real que encontraste probando el juego vos mismo — por ejemplo, algo que no funcionaba como esperabas la primera vez que lo jugaste.)_

## Declaración de autoría

_(Para completar a mano: qué herramienta usaste — por ejemplo Claude Code —, que el código lo generó un agente de IA bajo tu dirección a partir de tu ficha y tus prompts, y qué partes del código podés explicar vos mismo si te preguntan.)_
