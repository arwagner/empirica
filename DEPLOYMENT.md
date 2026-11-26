# Deployment

Empirica is a static Vite build served at https://empirica.vawagners.cloud/.

## Where it is served

- VPS `187.124.159.132`, run by the millwright repo (`../millwright`, change chg-010) at `/srv/millwright`.
- Caddy serves `empirica.vawagners.cloud` from `/srv/millwright/sites/empirica` (mounted as
  `/srv/sites/empirica`), sends `index.html` for unknown paths, caches `/assets/*` forever (Vite hashes the
  names) and revalidates the page on every load.

## Deploy on every push to main

`.github/workflows/deploy.yml`: `npm ci`, lint, test, then `npm run deploy`. Two repository secrets:

- `DEPLOY_SSH_KEY`: private half of the deploy key. Its public half is in root's `~/.ssh/authorized_keys` on
  the VPS, locked to rsync into the web root:
  `command="rrsync /srv/millwright/sites/empirica",restrict ssh-ed25519 ... empirica-deploy`.
- `DEPLOY_KNOWN_HOSTS`: the VPS's host keys, from `ssh-keyscan 187.124.159.132`.

`rrsync` makes every path relative to the web root, so the workflow sets `DEPLOY_PATH=.`.

## Deploy by hand

    npm run deploy

Builds, rsyncs `dist/` with `scripts/deploy.mjs` using your own root ssh, then fails unless
https://empirica.vawagners.cloud/ serves the `index.html` just built. `DEPLOY_USER`, `DEPLOY_HOST`,
`DEPLOY_PATH`, `DEPLOY_URL`, `DEPLOY_SSH_KEY` override the defaults (see the script header).

Keep the trailing slash on `dist/` if you ever rsync by hand, or the site answers 404.

## The professor's API (not deployed yet)

`server/` holds `empirica-api`, the AI professor's backend (see `server/README.md`). Until it runs on the VPS,
the site's Professor tab says the professor is unavailable and everything else works as before. Running it
needs a millwright change: an `empirica-api` service in `compose.yaml` built from `server/Dockerfile`, Caddy
sending `empirica.vawagners.cloud/api/*` to it, secrets in `/srv/secrets/empirica.env`, and a way for this
workflow to ship the container (the current deploy key can only rsync the web root).
