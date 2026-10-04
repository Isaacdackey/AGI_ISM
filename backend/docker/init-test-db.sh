#!/bin/sh
# Initialise la base de test e2e en plus de la base de dev.
# Exécuté uniquement à la première initialisation du volume pgdata.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	SELECT 'CREATE DATABASE ism_agi_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ism_agi_test')\gexec
EOSQL
