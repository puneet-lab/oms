#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# load deploy env
if [ -f ".env.deploy" ]; then
  export $(grep -v '^#' .env.deploy | xargs)
else
  echo "❌ .env.deploy not found"; exit 1
fi

# optional: pass TAG=latest|sha; default: latest + git sha
TAG_LATEST="latest"
TAG_SHA="$(git rev-parse --short HEAD)"

docker buildx create --name omsbuilder --use >/dev/null 2>&1 || true
docker buildx inspect --bootstrap >/dev/null

echo "🔐 ECR login: $AWS_REGION / $AWS_PROFILE"
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" \
| docker login --username AWS --password-stdin "${ECR_REPO%/*}"

echo "🐳 Building (linux/amd64) -> $IMAGE_NAME"
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE_NAME:$TAG_LATEST" \
  --load .

echo "🏷️  Tagging:"
docker tag "$IMAGE_NAME:$TAG_LATEST" "$ECR_REPO:$TAG_LATEST"
docker tag "$IMAGE_NAME:$TAG_LATEST" "$ECR_REPO:$TAG_SHA"

echo "📤 Pushing:"
docker push "$ECR_REPO:$TAG_LATEST"
docker push "$ECR_REPO:$TAG_SHA"

echo "✅ Pushed: $ECR_REPO:$TAG_LATEST and $ECR_REPO:$TAG_SHA"
