-- =============================================================================
-- Datos de prueba: un residente por especialidad. SOLO DESARROLLO.
--
-- ⚠ REINICIA los datos: borra TODOS los pedidos, los turnos de los becados, los tipos de
--   turno (turnos disponibles), las cuentas de residente y las fichas de becado.
--   No toca administradores, hospitales, feriados ni la configuración.
--
-- Requisitos: la API ya arrancó al menos una vez con DB_SYNC=true (crea las tablas
-- y los hospitales). Se puede ejecutar varias veces: siempre deja lo mismo.
--
--   Get-Content db/seed-prueba-becados.sql -Raw | docker exec -i apps-db-1 psql -U becados -d becados -v ON_ERROR_STOP=1
--
-- No crea tipos de turno: el administrador los crea en la app (Configuración → Tipos de turno).
-- Mientras no haya ninguno para su especialidad, un residente no puede agendar.
--
-- Cuentas (RUT / contraseña):
--   11.111.111-1  admin-prueba-123   administrador (se mantiene, para entrar al panel)
--   Residentes, todos con la contraseña  residente123:
--   18.234.561-K  Medicina Interna
--   17.456.782-4  Pediatría
--   19.345.673-1  Ginecología y Obstetricia
--   16.789.014-8  Cirugía General
--   20.123.455-7  Psiquiatría Adultos
--   18.901.236-5  Medicina Familiar
--   17.234.567-0  Anestesiología
--   19.876.548-1  Medicina de Urgencias
--   16.543.219-3  Imagenología
--   20.456.780-8  Neurología Adultos
--   18.765.431-9  Otorrinolaringología
--   17.890.122-2  Neurocirugía
--   19.012.343-K  Medicina Física y Rehabilitación
-- =============================================================================

BEGIN;

-- 1. Reinicio (en este orden por las claves foráneas).
DELETE FROM pedidos;
DELETE FROM turnos;
DELETE FROM turnos_disponibles;
DELETE FROM usuarios WHERE rol = 'residente' OR "becadoId" IS NOT NULL;
DELETE FROM becados;

-- 2. Hospitales (la API ya los crea al arrancar; esto es por si acaso).
INSERT INTO hospitales (nombre)
VALUES ('La Serena'), ('Coquimbo'), ('Ovalle')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Fichas de becado: una por especialidad (sin hospital fijo: se elige en cada pedido).
INSERT INTO becados (nombre, rut, especialidad)
VALUES
  ('Valentina Rojas',    '18234561-K', 'Medicina Interna'),
  ('Camila Soto',        '17456782-4', 'Pediatría'),
  ('Fernanda Muñoz',     '19345673-1', 'Ginecología y Obstetricia'),
  ('Diego Villanueva',   '16789014-8', 'Cirugía General'),
  ('Ignacio Araya',      '20123455-7', 'Psiquiatría Adultos'),
  ('Javiera Contreras',  '18901236-5', 'Medicina Familiar'),
  ('Matías Fuentes',     '17234567-0', 'Anestesiología'),
  ('Sebastián Castillo', '19876548-1', 'Medicina de Urgencias'),
  ('Antonia Pizarro',    '16543219-3', 'Imagenología'),
  ('Tomás Espinoza',     '20456780-8', 'Neurología Adultos'),
  ('Catalina Vega',      '18765431-9', 'Otorrinolaringología'),
  ('Benjamín Torres',    '17890122-2', 'Neurocirugía'),
  ('Martina Cortés',     '19012343-K', 'Medicina Física y Rehabilitación');

-- 4. Cuentas. El hash es bcrypt (costo 12), igual que el que genera la API.
--    residente123 -> $2b$12$/zfF...  |  admin-prueba-123 -> $2b$12$mwKO...
INSERT INTO usuarios (rut, "passwordHash", rol, "becadoId")
SELECT b.rut, '$2b$12$/zfFexPX8zBd2iJUXhKy6e2mQZ7Jv2SoJ1EqVWM0DLln0MhfJZKXW', 'residente', b.id
FROM becados b;

INSERT INTO usuarios (rut, "passwordHash", rol, "becadoId")
VALUES ('11111111-1', '$2b$12$mwKOrr0CJlOX4agJACNGjul5yZ239l7kfImsr6Zm8kqUr5LWN9cXS', 'admin', NULL)
ON CONFLICT (rut) DO NOTHING;

-- 5. Un feriado de prueba en un día hábil dentro de los próximos días (se ve como "Fer." en el calendario).
INSERT INTO feriados (fecha, nombre)
SELECT d::date, 'Feriado de prueba'
FROM generate_series(CURRENT_DATE + 8, CURRENT_DATE + 14, interval '1 day') AS d
WHERE extract(isodow FROM d) < 6
  AND NOT EXISTS (SELECT 1 FROM feriados WHERE nombre = 'Feriado de prueba')
LIMIT 1
ON CONFLICT (fecha) DO NOTHING;

COMMIT;

-- Resumen de lo que quedó
SELECT 'becados' AS tabla, count(*) FROM becados
UNION ALL SELECT 'usuarios residente', count(*) FROM usuarios WHERE rol = 'residente'
UNION ALL SELECT 'usuarios admin', count(*) FROM usuarios WHERE rol = 'admin'
UNION ALL SELECT 'turnos', count(*) FROM turnos
UNION ALL SELECT 'turnos_disponibles', count(*) FROM turnos_disponibles
UNION ALL SELECT 'pedidos', count(*) FROM pedidos;
