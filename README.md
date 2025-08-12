# Order Management System (OMS)

**Order Management System (OMS)** — a production-ready backend for multi-warehouse quoting and ordering, built for scalability on Kubernetes and provisioned with Terraform.

It handles smart warehouse allocation, cost-optimized shipping, dynamic volume discounts, strict order validation, and real-time inventory updates — all runnable locally with Docker and deployable to the cloud.

## 🚀 Live Demo

**API Base URL:** `http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000`

**Quick Test:**

```bash
curl http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/api/health
```

## 📋 API Examples

Ready-to-use curl commands for testing:

- **[Quotes API Examples](./examples/api-quotes.md)** - Get price quotes without creating orders
- **[Orders API Examples](./examples/api-orders.md)** - Create orders with inventory allocation

Try the examples to see multi-warehouse allocation, volume discounts, and business rule validation in action!

## Getting Started (Local)

Requires **Docker** and **Docker Compose** — no local Postgres installation needed.

```bash
# 1. Clone the repo
git clone <repo-url>
cd oms

# 2. Copy env file & adjust if needed
cp .env.example .env

# 3. Start the stack
docker compose up --build

# 4. Health check
curl http://localhost:3000/api/health
```

**.env example:**

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=oms
DATABASE_URL=postgres://admin:admin@postgres:5432/oms
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_PER_MINUTE=1000
TEST_DATABASE_URL=postgres://admin:admin@localhost:5432/oms
```

## API Overview

**Interactive API Documentation:** http://a0ae091c583294d3a9c88fff5917fe87-150428700.ap-southeast-1.elb.amazonaws.com:3000/docs/

Or check the **OpenAPI spec** at:

```bash
api-docs/v1/openapi.yaml
```

Authentication is a **dummy service** for demonstration purposes.

## Architecture

### Why a Modular Monolith (now)

- **Speed & cohesion**: One deployable keeps latency and overhead low during iteration.
- **Explicit boundaries**: Folders map to business domains; contracts are defined as ports (interfaces) so code remains swappable.
- **Operational simplicity**: Fewer moving parts to secure, observe, and scale; Kubernetes still handles horizontal scaling.
- **Clear path to microservices**: If needed, each module can be extracted behind the same ports without rewrites.

### Layer-by-layer

**1) `domain/`** — Business truth, no framework code  
Entities, value objects, and pure domain services for allocation, shipping, and discounts; enforces core business rules like the ≤15% shipping cost limit.

**2) `app/`** — Use cases, orchestration, transactions  
Implements workflows like `CreateQuote` and `CreateOrder`; ensures atomic stock decrement and applies policies across modules.

**3) `infra/`** — Adapters and gateways  
Persistence (Prisma repositories), idempotency store, seeds, and other external system integrations, all behind interfaces.

**4) `http/`** — Transport and delivery  
Express routes/controllers, request validation, security middleware (Helmet, CORS, rate limiting), and error mapping.

## What's Implemented

### Core Features

- Quote calculation without committing an order
- Optimized multi-warehouse allocation (lowest total shipping cost)
- Volume discount tiers applied dynamically
- Shipping cost validation (≤15% of total after discount)
- Real-time stock decrement within a transactional order flow
- Idempotency key support for safe retries

### Tech & Architecture

- Modular monolith with DDD-style separation (`domain`, `app`, `infra`, `http`)
- Express + TypeScript + PostgreSQL + Prisma ORM
- Haversine formula for geospatial shipping cost calculation
- Centralized request validation & error handling

### Security & Reliability

- **Rate limiting** to protect against abuse
- **Helmet** for secure HTTP headers
- **CORS origin control** for request safety
- **API versioning** for backward compatibility
- **Caching hooks** (ready for read-heavy endpoints)

### Ops & Scalability

- **Kubernetes deployment** (EKS-ready) for horizontal scaling
- **Terraform-managed infrastructure** for reproducible environments
- **CI/CD with GitHub Actions** for automated testing, builds, and deploys
- **Disaster recovery ready** with Infrastructure as Code, automated backups, and environment recreation procedures

### Data Bootstrapping

- Seed data for warehouses & pricing rules on startup

## Testing

```bash
docker compose exec app npm test
```

- **Unit tests**: pricing, discount, and shipping calculations
- **Integration tests**: end-to-end quote & order flows against test DB

## Next Steps

- Full idempotency middleware with persistent key store
- RBAC for sales/admin roles
- Multi-SKU support
- Multi-region deployment with global failover
- Advanced allocation heuristics + caching
