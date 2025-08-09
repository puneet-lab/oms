# 📦 Order Management System (OMS)

Backend service for managing orders, warehouses, and shipping calculations.  
Built with **Node.js**, **TypeScript**, **Express**, **PostgreSQL**, and **Prisma**.  
Runs locally via **Docker Compose** and deployable to AWS/EKS.

---

## 🚀 Features

- **TypeScript** for type safety
- **Prisma ORM** for database access
- **PostgreSQL** with Dockerized local setup
- Hot-reload in dev using `ts-node-dev`
- Production-ready multi-stage Dockerfile
- `.env`-based config (with Kubernetes secrets in prod)
- Structured for **modular monolith** → easy microservice migration

---

## 📂 Project Structure

```
oms/
 ├── prisma/                # Prisma schema & seeds
 │    ├── schema.prisma
 │    └── seed.ts
 ├── src/                   # Application source
 │    ├── server.ts         # App entry point
 │    └── modules/          # Feature modules (orders, warehouses, shipping)
 ├── .env                   # Environment variables (not committed)
 ├── .gitignore
 ├── docker-compose.yml
 ├── Dockerfile
 ├── Makefile
 ├── package.json
 └── tsconfig.json
```

---

## 🛠 Prerequisites

- **Docker** & **Docker Compose**
- **Node.js 20+** (if running outside Docker)
- **npm** (or yarn/pnpm)

---

## ⚙️ Setup & Local Development

1️⃣ **Clone the repository**

```bash
git clone <repo-url>
cd oms
```

2️⃣ **Create `.env` file**

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=
```

3️⃣ **Start services**

```bash
make up
```

4️⃣ **Run initial DB migration & seed**

```bash
make migrate-dev
make seed
```

5️⃣ **Access API**

```bash
curl http://localhost:3000/test
```

---

## 🐳 Docker Commands

- **Start services**: `make up`
- **Stop services**: `make down`
- **Rebuild without cache**: `make rebuild`
- **Run migrations**: `make migrate-dev`
- **Seed DB**: `make seed`
- **View logs**: `make logs`
- **Open container shell**: `make shell`

---

## 📜 Scripts

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `npm run dev`             | Start app in dev mode (hot reload) |
| `npm run build`           | Compile TypeScript to `dist/`      |
| `npm start`               | Run compiled app                   |
| `npm run prisma:generate` | Generate Prisma client             |
| `npm run migrate:dev`     | Run dev migrations                 |
| `npm run seed`            | Seed database                      |
