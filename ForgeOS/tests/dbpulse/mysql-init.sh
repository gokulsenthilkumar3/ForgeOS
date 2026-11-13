#!/bin/sh
set -eu
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
mysql --protocol=socket -uroot dbpulse_target <<SQL
CREATE USER 'dbpulse_reader'@'%' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
CREATE TABLE items (id integer PRIMARY KEY, name varchar(40), amount decimal(30,3), nullable_text text);
INSERT INTO items VALUES (1,'same',10.000,'present'),(2,'after',20.001,'present'),(4,'target-only',40.000,NULL),(5,'precise',9007199254740993.001,'');
GRANT SELECT ON dbpulse_target.* TO 'dbpulse_reader'@'%';
SQL
