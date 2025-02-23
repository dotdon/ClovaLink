#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
/app/wait-for-it.sh db:5432 -t 60

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Seed the database if needed
if [ "$SHOULD_SEED" = "true" ]; then
  echo "Seeding the database..."
  npx prisma db seed
fi

# Start the application
echo "Starting the application..."
exec "$@" 