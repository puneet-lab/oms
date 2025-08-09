#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST_DIR="$ROOT_DIR/infra/k8s"

export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)

echo "🔐 Creating secret from .env..."
envsubst < "$MANIFEST_DIR/secret.yaml" | kubectl apply -f -

echo "📦 Deploying Postgres..."
kubectl apply -f "$MANIFEST_DIR/postgres.yaml"

echo "🚀 Deploying App..."
kubectl apply -f "$MANIFEST_DIR/app.yaml"
