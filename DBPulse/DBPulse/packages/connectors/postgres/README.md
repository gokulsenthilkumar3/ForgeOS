# PostgreSQL Connector

This connector uses a **trigger + `pg_notify`** approach for Phase 2 real-time event capture.

## How it works

- Creates a reusable trigger function: `public.dbpulse_notify_event()`
- Listens on PostgreSQL channel: `dbpulse_audit`
- Converts each notification payload into a normalized `AuditEvent`
- Emits row-level `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` changes

## Important limitation

The connector currently creates the trigger function, but it does **not automatically attach triggers to every table** yet.
You still need to add triggers per table, for example:

```sql
CREATE TRIGGER dbpulse_users_audit
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.dbpulse_notify_event();
```

For `TRUNCATE`, use a statement-level trigger:

```sql
CREATE TRIGGER dbpulse_users_truncate_audit
AFTER TRUNCATE ON public.users
FOR EACH STATEMENT EXECUTE FUNCTION public.dbpulse_notify_event();
```
```

## Next improvement ideas

- Auto-generate triggers across selected schemas
- Add trigger cleanup / migration management
- Move from trigger-based capture to WAL/logical replication for lower DB overhead
