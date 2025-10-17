# WhisperPlaud Makefile
# Simple commands for common tasks

.PHONY: help bootstrap dev stop clean logs test docker-build docker-up docker-down docker-logs

# Default target
help:
	@echo "WhisperPlaud - Available Commands:"
	@echo ""
	@echo "  make bootstrap    - Initial setup (install dependencies)"
	@echo "  make dev          - Start development servers"
	@echo "  make stop         - Stop all services"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make logs         - View all logs"
	@echo ""
	@echo "Docker Commands (Recommended):"
	@echo "  make docker-build - Build Docker images"
	@echo "  make docker-up    - Start all services with Docker"
	@echo "  make docker-down  - Stop all Docker services"
	@echo "  make docker-logs  - View Docker logs"
	@echo "  make docker-worker-logs - View worker logs only"
	@echo ""
	@echo "Quick Start (Docker):"
	@echo "  1. make docker-build"
	@echo "  2. make docker-up"
	@echo "  3. Open http://localhost:3000"

# Bootstrap - Initial setup
bootstrap:
	@echo "Setting up WhisperPlaud..."
	cd medical-transcription && npm install
	cd medical-transcription && npx prisma generate
	cd medical-transcription && npx prisma migrate dev
	@echo ""
	@echo "✅ Bootstrap complete!"
	@echo "Next steps:"
	@echo "  1. Copy medical-transcription/.env.example to .env.local"
	@echo "  2. Add your HF_TOKEN to .env.local"
	@echo "  3. Run 'make docker-up' to start services"

# Development mode (without Docker)
dev:
	@echo "Starting development servers..."
	@echo "Note: For WhisperX worker, use Docker instead (make docker-up)"
	cd medical-transcription && npm run dev

# Stop services
stop:
	@echo "Stopping services..."
	docker compose down

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cd medical-transcription && rm -rf .next node_modules dist
	docker compose down -v --rmi local
	@echo "✅ Cleanup complete"

# View logs
logs:
	docker compose logs -f

# Docker commands
docker-build:
	@echo "Building Docker images..."
	@echo "This may take 10-15 minutes on first build..."
	docker compose build
	@echo "✅ Docker images built successfully"

docker-up:
	@echo "Starting all services with Docker..."
	docker compose up -d
	@echo ""
	@echo "✅ Services started!"
	@echo ""
	@echo "Service URLs:"
	@echo "  - Web App: http://localhost:3000"
	@echo "  - MinIO Console: http://localhost:9001"
	@echo ""
	@echo "View logs: make docker-logs"

docker-down:
	@echo "Stopping all Docker services..."
	docker compose down
	@echo "✅ Services stopped"

docker-logs:
	@echo "Viewing Docker logs (Ctrl+C to exit)..."
	docker compose logs -f

docker-worker-logs:
	@echo "Viewing WhisperX worker logs (Ctrl+C to exit)..."
	docker compose logs -f worker

docker-restart:
	@echo "Restarting services..."
	docker compose restart
	@echo "✅ Services restarted"

docker-restart-worker:
	@echo "Restarting WhisperX worker..."
	docker compose restart worker
	@echo "✅ Worker restarted"

# Docker debugging
docker-shell:
	@echo "Opening shell in worker container..."
	docker compose exec worker bash

docker-gpu-check:
	@echo "Checking GPU availability in Docker..."
	docker compose exec worker python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}'); print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB' if torch.cuda.is_available() else '')"

# Test
test:
	@echo "Running tests..."
	cd medical-transcription && npm test
