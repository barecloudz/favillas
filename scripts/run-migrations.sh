#!/bin/bash
# Load environment variables and run migrations

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Run migrations
node scripts/run-preview-migrations.js
