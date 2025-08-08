#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT_DIR/infra/k8s/all.yaml"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "❌ .env not found in repo root"
  exit 1
fi
if [ ! -f "$MANIFEST" ]; then
  echo "❌ Manifest not found at $MANIFEST"
  exit 1
fi

# Load env
export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)

echo "💣 Deleting old resources..."
kubectl delete deploy app postgres --ignore-not-found
kubectl delete svc app postgres --ignore-not-found
kubectl delete hpa app-hpa --ignore-not-found
kubectl delete secret app-env --ignore-not-found

echo "⏳ Waiting for resources to terminate..."
sleep 5

echo "🚀 Re-applying manifests with envsubst..."
envsubst < "$MANIFEST" | kubectl apply -f -

echo "✅ Waiting for Postgres..."
kubectl rollout status deploy/postgres

echo "✅ Waiting for App..."
kubectl rollout status deploy/app

echo "🎉 Recreate complete!"
kubectl get pods,svc,hpa
