# zentro-web

Frontend da plataforma **Zentro** — workspace Angular com duas aplicações:

- **storefront** — loja pública de cada tenant (porta 4200)
- **admin** — painel do lojista + painel da plataforma (porta 4300)
- **projects/shared** — lib compartilhada (`@zentro/shared`): modelos, api-client,
  auth/JWT, mapa Leaflet (`<z-map>`), tema PrimeNG e tokens da marca

## Stack

Angular 22 (standalone + signals, zoneless) · PrimeNG 21 · Leaflet/OpenStreetMap · chart.js

## Rodando em desenvolvimento

Pré-requisito: `zentro-api` rodando em http://localhost:8082 (o proxy `/api` aponta para lá).

```bash
npm install
npx ng serve storefront   # http://loja1.localhost:4200 e http://loja2.localhost:4200
npx ng serve admin        # http://localhost:4300
```

> Navegadores resolvem `*.localhost` sozinhos — sem configurar DNS/hosts.
> O proxy preserva o header `Host`, então o backend resolve o tenant normalmente.

Logins dev: lojista `admin@loja1.com` / `123456` · plataforma `admin@zentro.com` / `123456`.

## Identidade visual

Tokens CSS em `projects/shared/styles/tokens.scss`:
proposta A (clara, Poppins) em `:root`, proposta B (dark) em `[data-theme="dark"]`
(toggle no topo do admin). Material da marca: `docs/brand/`.

## Build

```bash
npx ng build storefront && npx ng build admin
```
