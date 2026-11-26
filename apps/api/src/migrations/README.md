# Migraciones

Aquí van las migraciones de TypeORM (una clase por archivo, con `up` y `down`).
`inicial.ts` crea el esquema completo en una base vacía. Tiene la fecha más antigua para correr primero, y
no hace nada si las tablas ya existen (bases creadas con `DB_SYNC=true`).

Después de cada cambio en una entidad, generar una nueva contra una base que tenga el esquema al día
(creada con migraciones, no con `DB_SYNC=true`), revisarla y subirla a git junto con el cambio:
```bash
pnpm --filter api build
pnpm --filter api migration:generate src/migrations/NombreDelCambio
``` En producción `DB_SYNC=false` y `DB_MIGRAR=true`: la API aplica
las pendientes al iniciar.
Ojo con las bases que ya tienen datos creadas con `DB_SYNC=true` (rama avance-backend): el modelo
cambió (el hospital pasó del becado al pedido, la anticipación pasó de horas a días). Revisar la
migración generada antes de aplicarla y hacer un respaldo (`pg_dump`) primero.