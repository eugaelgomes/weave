#!/bin/bash
# ==============================================================================
# Clean Lingering Development Ports and Processes
# Usage: ./scripts/clean-ports.sh [port1 port2 ...]
# Default ports: 3000, 8080, 5000, 5001
# ==============================================================================

TARGET_PORTS=("$@")
if [ ${#TARGET_PORTS[@]} -eq 0 ]; then
  TARGET_PORTS=(3000 8080 5000 5001)
fi

echo "[clean-ports] Auditing lingering development ports and processes..."

KILLED_ANY=false

for PORT in "${TARGET_PORTS[@]}"; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "[clean-ports] Terminating process bound to port $PORT (PIDs: $(echo $PIDS | tr '\n' ' '))..."
    kill -9 $PIDS 2>/dev/null || true
    KILLED_ANY=true
  fi
done

# Clean any lingering next dev processes
NEXT_PIDS=$(pgrep -f "next dev" 2>/dev/null)
if [ -n "$NEXT_PIDS" ]; then
  echo "[clean-ports] Terminating lingering next dev processes (PIDs: $(echo $NEXT_PIDS | tr '\n' ' '))..."
  kill -9 $NEXT_PIDS 2>/dev/null || true
  KILLED_ANY=true
fi

if [ "$KILLED_ANY" = true ]; then
  echo "[clean-ports] Port cleanup complete."
else
  echo "[clean-ports] No active processes found on target ports."
fi
