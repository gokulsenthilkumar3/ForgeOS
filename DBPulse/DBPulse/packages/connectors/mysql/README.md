# MySQL Connector

Captures row-level changes from MySQL using **ZongJi** (binlog streaming).

## MySQL Prerequisites

The following MySQL server settings are required:

```ini
# my.cnf / my.ini
[mysqld]
server-id         = 1
log_bin           = /var/log/mysql/mysql-bin.log
binlog_format     = ROW
binlog_row_image  = FULL
```

The connecting user needs `REPLICATION SLAVE` and `REPLICATION CLIENT` privileges:

```sql
GRANT REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'dbpulse_user'@'%';
FLUSH PRIVILEGES;
```

## Known Limitations

| Limitation | Notes |
|---|---|
| No raw SQL | Binlog ROW format doesn't expose the original query text |
| Actor = DB user | Per-statement actor isn't available in binlog; actor is always the connecting user |
| TRUNCATE not captured | ZongJi does not emit TRUNCATE events; use the PostgreSQL connector or app-level tracking |
| Requires `binlog_format=ROW` | STATEMENT or MIXED format will not produce full before/after snapshots |

## Docker Compose Example

```yaml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: rootpassword
    MYSQL_DATABASE: mydb
  command: >
    --server-id=1
    --log-bin=mysql-bin
    --binlog-format=ROW
    --binlog-row-image=FULL
  ports:
    - "3306:3306"
```
