#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v reader_password="$POSTGRES_PASSWORD" <<'SQL'
CREATE ROLE dbpulse_reader LOGIN PASSWORD :'reader_password';
CREATE TABLE items (id integer PRIMARY KEY, name varchar(40), amount numeric(30,3), nullable_text text);
INSERT INTO items VALUES (1,'same',10.000,'present'),(2,'before',20.000,'present'),(3,'source-only',30.000,NULL),(5,'precise',9007199254740993.001,NULL);
GRANT CONNECT ON DATABASE dbpulse_source TO dbpulse_reader;
GRANT USAGE ON SCHEMA public TO dbpulse_reader;
GRANT SELECT ON items TO dbpulse_reader;
SQL
