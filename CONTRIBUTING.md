# Contribuir a RaidMate

Gracias por querer mejorar el proyecto. La regla más importante:

> **RaidMate es una herramienta de planificación. No automatiza ARC Raiders ni interactúa con el juego de ninguna forma.**

No se aceptan PRs que añadan:

- lectura de memoria o de pantalla del juego;
- hooks globales de teclado o ratón;
- inyección de input;
- overlays que se dibujen dentro del juego;
- evasión de anti-cheat;
- auto-loot, aim assist, radar o cualquier ventaja automatizada.

## Cómo contribuir

1. Abre un issue describiendo el cambio o el error.
2. Haz un fork y crea una rama (`feat/nombre-corto` o `fix/nombre-corto`).
3. Mantén el estilo y la estructura existentes.
4. Prueba en escritorio y móvil.
5. Abre un PR con una descripción clara y capturas si aplica.

## Comprobaciones

```bash
node --check js/app.js
node --check js/heatmap.js
node --check js/events.js
python -m py_compile server.py scripts/build_data.py
```

## Datos

Si actualizas datos de mapas, objetos o eventos:

- indica la fuente y la fecha;
- no inventes coordenadas ni valores;
- si usas una captura o una web de la comunidad, enlázala;
- ten en cuenta que los datos de MetaForge se publican con sus propias condiciones (ver [NOTICE.md](NOTICE.md)).

## Código de conducta

Sé respetuoso. No se toleran insultos, acoso ni contenido discriminatorio.
