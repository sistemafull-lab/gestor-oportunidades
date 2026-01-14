#!/bin/bash

# Matar procesos anteriores con más agresividad
echo "🛑 Deteniendo procesos anteriores en puertos 3001, 5173, 8080..."
fuser -k 3001/tcp || true
fuser -k 5173/tcp || true
fuser -k 8080/tcp || true
pkill -f cloud_sql_proxy || true
pkill -f "node.*backend" || true
pkill -f "vite" || true
sleep 2

echo "🧹 Limpieza completada."

# 1. Cloud SQL Proxy
echo "🔌 Iniciando Cloud SQL Proxy (Puerto 5432)..."
nohup ./cloud_sql_proxy gen-lang-client-0042880410:us-west1:gestor-oportunidades --port 5432 > proxy.log 2>&1 &

# 2. Backend
echo "🚀 Iniciando Backend (Puerto 3001)..."
(cd backend && nohup npm run dev > ../backend.log 2>&1 &)

# 3. Frontend2
echo "🎨 Iniciando Frontend2 (Puerto 5173)..."
(cd frontend && nohup npm run dev > ../frontend.log 2>&1 &)

echo "✅ Sistema iniciado."
echo "🔗 Acceso Frontend: http://localhost:5173"
echo "📡 Acceso API: http://localhost:3001/api/health"

sleep 3
echo "📊 Estado final de procesos:"
ps aux | grep -E "cloud_sql_proxy|node|vite" | grep -v grep
