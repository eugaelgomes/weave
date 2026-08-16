#!/bin/bash
set -e

# Cleanup any existing container
docker stop temp-prisma-postgres 2>/dev/null || true
docker rm temp-prisma-postgres 2>/dev/null || true

echo "Starting temporary PostgreSQL container (with pgvector)..."
docker run --name temp-prisma-postgres -e POSTGRES_PASSWORD=prisma -e POSTGRES_USER=prisma -e POSTGRES_DB=theweave -p 54321:5432 -d pgvector/pgvector:pg15

echo "Waiting for PostgreSQL to start..."
until docker exec temp-prisma-postgres pg_isready -U prisma -d theweave; do
  sleep 2
done
sleep 2 # give it a moment to fully accept connections

echo "Loading database structure..."
docker exec -i temp-prisma-postgres psql -U prisma -d theweave < /home/gaelgomes/projetos/theweave/database_structure.sql

echo "Initializing Prisma in packages/database..."
cd /home/gaelgomes/projetos/theweave/packages/database
npm install

mkdir -p prisma
echo 'generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://prisma:prisma@localhost:54321/theweave?schema=public"
}' > prisma/schema.prisma

echo "Running prisma db pull..."
npx prisma db pull

echo "Destroying temporary PostgreSQL container..."
docker stop temp-prisma-postgres
docker rm temp-prisma-postgres

echo "Prisma generation completed."
