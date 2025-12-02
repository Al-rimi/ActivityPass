#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
while ! python -c "import pymysql; pymysql.connect(host='${DB_HOST}', user='${DB_USER}', password='${DB_PASSWORD}', database='${DB_NAME}', port=int('${DB_PORT}'))" 2>/dev/null; do
    echo "Database not ready, waiting..."
    sleep 2
done

echo "Running migrations..."
python manage.py migrate

echo "Seeding data..."
python manage.py seed_students

echo "Starting Gunicorn..."
exec gunicorn ActivityPass.wsgi:application --bind 0.0.0.0:8000