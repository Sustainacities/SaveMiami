.PHONY: up down restart logs migrate seed test lint format build help

DOCKER_COMPOSE = docker compose

help:
	@echo "AquaDome Core MVP — Make targets"
	@echo "  up        Start all services"
	@echo "  down      Stop all services"
	@echo "  restart   Restart all services"
	@echo "  logs      Tail logs (all services)"
	@echo "  migrate   Run Alembic migrations"
	@echo "  seed      Seed Biscayne Bay demo data"
	@echo "  test      Run backend tests"
	@echo "  lint      Run ruff + mypy"
	@echo "  format    Run ruff format"
	@echo "  build     Build all Docker images"
	@echo "  shell-db  Open psql shell"
	@echo "  shell-be  Open backend shell"

up:
	$(DOCKER_COMPOSE) up -d
	@echo "AquaDome is up → http://localhost"

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) restart

logs:
	$(DOCKER_COMPOSE) logs -f

migrate:
	$(DOCKER_COMPOSE) exec backend alembic upgrade head

seed:
	$(DOCKER_COMPOSE) exec backend python scripts/seed_biscayne_bay.py

test:
	$(DOCKER_COMPOSE) exec backend pytest tests/ -v

lint:
	$(DOCKER_COMPOSE) exec backend ruff check app/ && mypy app/

format:
	$(DOCKER_COMPOSE) exec backend ruff format app/

build:
	$(DOCKER_COMPOSE) build

shell-db:
	$(DOCKER_COMPOSE) exec db psql -U aquadome -d aquadome

shell-be:
	$(DOCKER_COMPOSE) exec backend bash

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev
