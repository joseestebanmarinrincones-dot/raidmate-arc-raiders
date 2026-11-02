# Publicación y espejos

## GitHub (principal)

El repositorio principal es:

https://github.com/joseestebanmarinrincones-dot/raidmate-arc-raiders

GitHub Pages está configurado con GitHub Actions. Cada push a `main` publica la web en:

https://joseestebanmarinrincones-dot.github.io/raidmate-arc-raiders/

## SourceForge / GitLab / Codeberg

No puedo crear cuentas ni publicar en plataformas que requieren credenciales de una cuenta que no está autenticada en este entorno. Para replicar el proyecto:

1. Crea el proyecto vacío en la plataforma.
2. Importa el repositorio de GitHub por URL.
3. Licencia: MIT (código); incluye `NOTICE.md` para datos y mapas de terceros.
4. Sube el ZIP portable de la última release como descarga.
5. Enlaza la web de GitHub Pages como demo.

## Reddit

El borrador está en [`docs/reddit-post.md`](reddit-post.md). El autor del proyecto lo publicará manualmente.

## Checklist antes de publicar una release

- [ ] `version.json` actualizado.
- [ ] `README.md` y capturas actualizadas.
- [ ] `data/events/*.json` recientes.
- [ ] `data/items.json` y `data/market.json` con la última build.
- [ ] `node --check` y `python -m py_compile` pasan.
- [ ] No hay `data/raw` ni secretos en el commit.
- [ ] La app se prueba en escritorio y móvil.
- [ ] Se recuerda que no es un cheat y que no interactúa con el juego.
