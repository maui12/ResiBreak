# Migraciones

Aquí van las migraciones de TypeORM (una clase por archivo, con `up` y `down`).

La primera se genera una sola vez contra una base **vacía** (por ejemplo, `db_test` o una base nueva):

```bash
pnpm --filter api build
pnpm --filter api migration:generate src/migrations/Inicial
```

Después de cada cambio en una entidad, generar una nueva (`src/migrations/NombreDelCambio`), revisarla
y subirla a git junto con el cambio. En producción `DB_SYNC=false` y `DB_MIGRAR=true`: la API aplica
las pendientes al iniciar.

Ojo con las bases que ya tienen datos creadas con `DB_SYNC=true` (rama avance-backend): el modelo
cambió (el hospital pasó del becado al pedido, la anticipación pasó de horas a días). Revisar la
migración generada antes de aplicarla y hacer un respaldo (`pg_dump`) primero.
