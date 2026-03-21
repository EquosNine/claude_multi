#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing server on port 3456
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3456 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null

# Build frontend
~/.bun/bin/bun run build

# Start server
echo "Starting claude-multi at http://localhost:3456"
~/.bun/bin/bun run server.ts
