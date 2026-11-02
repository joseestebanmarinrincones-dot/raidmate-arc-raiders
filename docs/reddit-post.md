# Borrador para Reddit — publícalo tú

> El usuario pidió publicarlo él mismo. Este archivo es solo un borrador listo para copiar y pegar. No lo he publicado.

## Título

**RaidMate — un compañero de raid open-source para ARC Raiders (rutas, timer, eventos por región y heatmaps de loot)**

## Cuerpo

Hola, raiders.

He hecho **RaidMate**, una web app open-source para planificar raids de ARC Raiders. No es un cheat ni un auto-looter: no lee la pantalla, no mueve el ratón, no envía teclas al juego y no toca EAC. Es una herramienta de planificación para tener en una segunda pantalla o en el móvil.

**Qué incluye:**

- Rutas de loot para los 7 mapas: Dam Battlegrounds, Spaceport, Buried City, Blue Gate, Stella Montis, Riven Tides y Pendola Pass.
- Timer de 30 minutos con pausa y reinicio.
- Hotkey configurable para marcar la siguiente parada (por defecto `H`).
- Calendario de eventos por región (EU, NA, SA, Asia, Oceanía): evento activo, próximo, duración e intervalo.
- Buscador de objetos con rareza, categoría, valor de comerciante, mercado comunitario en semillas y valor por kg.
- Heatmap interactivo con zoom y arrastre para ver en qué zonas hay más contenedores compatibles con el tipo de loot del objeto.
- Notas por mapa y progreso guardado en el navegador.

**Enlaces:**

- Web (siempre actualizada): https://joseestebanmarinrincones-dot.github.io/raidmate-arc-raiders/
- Código / descarga: https://github.com/joseestebanmarinrincones-dot/raidmate-arc-raiders
- Licencia: MIT (código). Los datos y mapas de terceros tienen su propio aviso.

**Qué NO es:**

- No automatiza el loot.
- No es un overlay dentro del juego.
- No evita anti-cheat.
- No garantiza que un objeto vaya a spawnear: el heatmap es una estimación de contenedores compatibles, no telemetría.

**Datos y limitaciones:**

- Objetos, valores y eventos vienen de la API pública de MetaForge, con atribución.
- El “mercado” es la mediana comunitaria de MetaForge en semillas; no hay una casa de subastas oficial. El valor de comerciante son coins.
- Los eventos se actualizan cada hora en la versión web. La copia local tiene un servidor Python opcional para eventos/mercado en vivo.
- Es un proyecto fan no oficial, sin relación con Embark.

Si lo probáis, me interesa sobre todo feedback de:
- rutas que no tengan sentido en el juego actual;
- objetos o mapas con datos raros;
- regiones/eventos desfasados;
- bugs de layout en móvil.

¡Nos vemos topside!

---

## Notas para publicar

- Adjunta 1–2 capturas (`docs/raid.png`, `docs/items.png` o `docs/events.png`).
- Revisa las reglas del subreddit sobre autopromoción y enlaces.
- No publiques capturas con nombres de usuario, IDs de cuenta ni datos personales.
- Si el post se etiqueta como auto-promoción, dilo claramente.
