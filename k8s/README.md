# Free local Kubernetes demo (kind)

Kubernetes manages the **same Docker images** used by Docker Compose; this does not deploy to AWS or require a credit card. Requires Docker, `kind`, `kubectl`, and `openssl`. Use only synthetic/demo accounts. Never apply these development manifests to a public cluster.

```bash
kind create cluster --name finvision-portfolio
docker build -t finvision-ai-service:local ./ai-service
docker build -t finvision-web:local -f Dockerfile.web --build-arg VITE_AI_SERVICE_URL=http://localhost:8000 .
kind load docker-image --name finvision-portfolio finvision-ai-service:local finvision-web:local
kubectl create namespace finvision-demo
DB_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"
kubectl -n finvision-demo create secret generic app-secrets \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD" \
  --from-literal=FINVISION_JWT_SECRET="$JWT_SECRET" \
  --from-literal=DATABASE_URL="postgresql+psycopg://finvision:$DB_PASSWORD@postgres:5432/finvision"
unset DB_PASSWORD JWT_SECRET
kubectl -n finvision-demo apply -f k8s/local.yaml
kubectl -n finvision-demo rollout status deployment/postgres --timeout=180s
kubectl -n finvision-demo rollout status deployment/ai-service --timeout=180s
kubectl -n finvision-demo port-forward service/ai-service 8000:8000
```

Open another terminal to access the frontend via `kubectl -n finvision-demo port-forward service/web 8080:80`. Both port-forwards are loopback-only. The GraphQL route is `POST http://localhost:8000/api/graphql` and requires an account JWT. Redis is included to mirror Compose. The PostgreSQL PVC uses the cluster's local default StorageClass; the workload is **single-instance**, not high availability. The database is not exposed by a NodePort or LoadBalancer.

Cleanup: `kind delete cluster --name finvision-portfolio`. This deletes the demo's cluster and persistent data.
