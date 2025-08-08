#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Destroying all resources..."

# Delete deployments
echo "Deleting deployments..."
kubectl delete deploy app postgres --ignore-not-found

# Delete services  
echo "Deleting services..."
kubectl delete svc app postgres --ignore-not-found

# Delete HPA
echo "Deleting HPA..."
kubectl delete hpa app-hpa --ignore-not-found

# Delete secrets
echo "Deleting secrets..."
kubectl delete secret app-env --ignore-not-found

# Wait for cleanup
echo "Waiting for resources to terminate..."
sleep 10

# Show remaining resources
echo "Remaining resources:"
kubectl get all,secrets,configmaps,pvc -o wide

echo "Destroy complete!"chmod +x scripts/destroy.sh