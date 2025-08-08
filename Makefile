# Variables
SERVICE_APP=app

# Start containers (dev mode)
up:
	docker compose up --build

# Stop containers
down:
	docker compose down

# Rebuild containers without cache
rebuild:
	docker compose build --no-cache

# Run Prisma migrations in dev
migrate-dev:
	docker compose exec $(SERVICE_APP) npm run migrate:dev -- --name init

# Deploy Prisma migrations in prod
migrate-prod:
	docker compose exec $(SERVICE_APP) npm run migrate:prod

# Seed the database
seed:
	docker compose exec $(SERVICE_APP) npm run seed

# Run Prisma Studio
studio:
	docker compose exec $(SERVICE_APP) npx prisma studio

# Open a shell in the app container
shell:
	docker compose exec $(SERVICE_APP) sh

# View logs
logs:
	docker compose logs -f

# Clean everything (containers + volumes)
clean:
	docker compose down -v --remove-orphans
