#!/usr/bin/env bash
# Sobe um app Angular usando o Node do nvm diretamente, sem passar pelos shims
# do nodenv (cuja versao global eh v14 e nao atende o Angular 22).
# Uso: ./serve.sh storefront   |   ./serve.sh admin
set -e

NODE_BIN="$HOME/.nvm/versions/node/v24.15.0/bin"
if [ ! -x "$NODE_BIN/node" ]; then
  echo "Node v24.15.0 nao encontrado em $NODE_BIN" >&2
  echo "Instale com: nvm install 24.15.0" >&2
  exit 1
fi

# coloca o node do nvm na frente de tudo (inclusive dos shims do nodenv)
export PATH="$NODE_BIN:$PATH"
cd "$(dirname "$0")"

APP="${1:-storefront}"
echo "Node $($NODE_BIN/node -v) | servindo: $APP"
exec npx ng serve "$APP"
