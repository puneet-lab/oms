#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG ======
ACCOUNT_ID="408252911248"
REGION="ap-southeast-1"
CLUSTER="oms-cluster"
NAMESPACE="default"       # you said your namespace is default
SA_NAME="ci-deployer"
KUBECONFIG_OUT="kubeconfig-ci"

# Use your local AWS profile (override by exporting AWS_PROFILE=xyz)
AWS_PROFILE="${AWS_PROFILE:-personal}"
export AWS_PROFILE
export AWS_REGION="$REGION"

echo "🛠️  Cluster: $CLUSTER  Region: $REGION  Namespace: $NAMESPACE  Profile: $AWS_PROFILE"

# Safety: ensure profile is the expected account
WHO=$(aws sts get-caller-identity --query 'Account' --output text)
if [[ "$WHO" != "$ACCOUNT_ID" ]]; then
  echo "❌ AWS profile ($AWS_PROFILE) is for account $WHO, expected $ACCOUNT_ID"
  exit 1
fi

# Ensure local kubeconfig has the EKS cluster
aws eks update-kubeconfig --name "$CLUSTER" --region "$REGION" >/dev/null

# 0) Ensure namespace exists (default already exists, but keep this idempotent)
kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || kubectl create ns "$NAMESPACE"

# 1) Create ServiceAccount + minimal Role + RoleBinding (scoped to your namespace)
cat <<YAML | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${SA_NAME}
  namespace: ${NAMESPACE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-deployer-min
  namespace: ${NAMESPACE}
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get","list","watch","update","patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get","list","watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get","create","patch","update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-min-rb
  namespace: ${NAMESPACE}
subjects:
  - kind: ServiceAccount
    name: ${SA_NAME}
    namespace: ${NAMESPACE}
roleRef:
  kind: Role
  name: ci-deployer-min
  apiGroup: rbac.authorization.k8s.io
YAML

# 2) Create a long-lived ServiceAccount token Secret (simple for PoC)
cat <<YAML | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ${SA_NAME}-token
  namespace: ${NAMESPACE}
  annotations:
    kubernetes.io/service-account.name: ${SA_NAME}
type: kubernetes.io/service-account-token
YAML

# 3) Build kubeconfig from cluster data + SA token (with a short retry for token readiness)
CA=$(aws eks describe-cluster --name "$CLUSTER" --region "$REGION" --query "cluster.certificateAuthority.data" --output text)
ENDPOINT=$(aws eks describe-cluster --name "$CLUSTER" --region "$REGION" --query "cluster.endpoint" --output text)

echo "⏳ Waiting for ServiceAccount token to be populated..."
TOKEN=""
for i in {1..12}; do   # up to ~60s
  TOKEN=$(kubectl -n "$NAMESPACE" get secret ${SA_NAME}-token -o jsonpath='{.data.token}' 2>/dev/null || true)
  if [[ -n "$TOKEN" ]]; then
    TOKEN=$(echo "$TOKEN" | base64 -d)
    break
  fi
  sleep 5
done
if [[ -z "$TOKEN" ]]; then
  echo "❌ SA token not ready. Try re-running in a few seconds."
  exit 1
fi

cat > "$KUBECONFIG_OUT" <<EOF
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${CA}
    server: ${ENDPOINT}
  name: oms
contexts:
- context:
    cluster: oms
    namespace: ${NAMESPACE}
    user: ${SA_NAME}
  name: oms
current-context: oms
kind: Config
users:
- name: ${SA_NAME}
  user:
    token: ${TOKEN}
EOF

# 4) Print base64 for GitHub secret, and a quick auth check using this kubeconfig
KUBECONFIG_B64=$(base64 < "$KUBECONFIG_OUT" | tr -d '\n')

echo
echo "✅ Kubeconfig created: $KUBECONFIG_OUT"
echo "👉 Add this as GitHub Environment secret: KUBECONFIG_B64"
echo "$KUBECONFIG_B64"
echo

echo "🔍 Verifying permissions via the generated kubeconfig..."
KUBECONFIG="$KUBECONFIG_OUT" kubectl -n "$NAMESPACE" auth can-i patch deployment || true
echo "🎉 Done."
