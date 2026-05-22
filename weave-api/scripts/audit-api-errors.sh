#!/usr/bin/env bash
# Audits weave-api controllers for unsafe error response patterns.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULES="${ROOT}/src/modules"
EXIT=0

echo "== Checking for error.message in HTTP responses =="
if rg 'error\.message' "${MODULES}" --glob '*.controller.js' 2>/dev/null; then
  echo "FAIL: error.message exposed in controller responses (see above)"
  EXIT=1
else
  echo "OK: no error.message in controller files"
fi

echo ""
echo "== Checking for common Portuguese error strings in controllers =="
PT_PATTERN='não encontrad|Erro ao |obrigatório|Acesso negado|Usuário não|Falha ao '
if rg -i "${PT_PATTERN}" "${MODULES}" --glob '*.controller.js' 2>/dev/null; then
  echo "WARN: Portuguese error strings found (migrate to English + AppError)"
  EXIT=1
else
  echo "OK: no common PT error patterns in controllers"
fi

exit "${EXIT}"
