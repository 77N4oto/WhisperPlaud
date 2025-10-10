SHELL := bash
APP_DIR := medical-transcription

.PHONY: help bootstrap dev test desktop package

help:
	@echo "make bootstrap  - Create Next.js app and install deps"
	@echo "make dev        - Run dev server"
	@echo "make test       - Run tests (placeholder)"
	@echo "make desktop    - Run Electron app (dev mode)"
	@echo "make package    - Build Windows installer"

bootstrap:
	@set -euo pipefail; \
	CI=1 PAGER=cat GIT_PAGER=cat DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0; \
	timeout 600 npx --yes create-next-app@latest $(APP_DIR) --ts --tailwind --app --src-dir --eslint --use-npm --import-alias "@/*" | tail -n 200; \
	cd $(APP_DIR); \
	timeout 600 npm install @tanstack/react-query @tanstack/react-query-devtools bullmq ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner bcryptjs jsonwebtoken sqlite3 better-sqlite3 prisma @prisma/client lucide-react class-variance-authority clsx tailwind-merge date-fns zod react-hook-form @hookform/resolvers eventsource-parser | tail -n 200; \
	timeout 600 npm install -D @types/bcryptjs @types/jsonwebtoken @types/eventsource | tail -n 200; \
	timeout 600 npx --yes prisma init --datasource-provider sqlite | tail -n 200; \
	echo "__CURSOR_DONE__"

dev:
	@set -euo pipefail; \
	CI=1 PAGER=cat GIT_PAGER=cat DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0; \
	cd $(APP_DIR); \
	timeout 600 npm run dev --silent | tail -n 200; \
	echo "__CURSOR_DONE__"

test:
	@set -euo pipefail; \
	CI=1 PAGER=cat GIT_PAGER=cat DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0; \
	cd $(APP_DIR); \
	timeout 600 npm test --silent || true; \
	echo "__CURSOR_DONE__"

desktop:
	@set -euo pipefail; \
	cd $(APP_DIR); \
	npm run electron:dev; \
	echo "__CURSOR_DONE__"

package:
	@set -euo pipefail; \
	cd $(APP_DIR); \
	timeout 600 npm run electron:build | tail -n 200; \
	echo "__CURSOR_DONE__"

