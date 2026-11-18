-- =============================================================================
-- Datos mínimos para probar la vista del becado (app móvil). SOLO DESARROLLO.
--
-- Requisitos: la API ya arrancó al menos una vez con DB_SYNC=true (crea las tablas
-- y los hospitales). Se puede ejecutar varias veces: no duplica datos.
--
--   docker exec -i apps-db-1 psql -U becados -d becados -v ON_ERROR_STOP=1 < db/seed-prueba-becados.sql
--
-- Cuentas que crea (RUT / contraseña):
--   11.111.111-1  admin-prueba-123   administrador
--   12.345.678-5  residente123       residente de Pediatría (ve 3 turnos)
--   1.234.567-4   residente123       residente de Cirugía General (ve 2 turnos)
-- =============================================================================

BEGIN;

-- Hospitales (la API ya los crea al arrancar; esto es por si acaso).
INSERT INTO hospitales (nombre)
VALUES ('La Serena'), ('Coquimbo'), ('Ovalle')
ON CONFLICT (nombre) DO NOTHING;

-- Fichas de becado (sin hospital fijo: se elige en cada pedido).
INSERT INTO becados (nombre, rut, especialidad)
VALUES
  ('Camila Soto (prueba)', '12345678-5', 'Pediatría'),
  ('Diego Villanueva (prueba)', '1234567-4', 'Cirugía General')
ON CONFLICT (rut) DO NOTHING;

-- Cuentas. El hash es bcrypt (costo 12), igual que el que genera la API.
INSERT INTO usuarios (rut, "passwordHash", rol, "becadoId")
VALUES
  ('11111111-1', '$2b$12$mwKOrr0CJlOX4agJACNGjul5yZ239l7kfImsr6Zm8kqUr5LWN9cXS', 'admin', NULL),
  ('12345678-5', '$2b$12$/zfFexPX8zBd2iJUXhKy6e2mQZ7Jv2SoJ1EqVWM0DLln0MhfJZKXW', 'residente',
     (SELECT id FROM becados WHERE rut = '12345678-5')),
  ('1234567-4', '$2b$12$/zfFexPX8zBd2iJUXhKy6e2mQZ7Jv2SoJ1EqVWM0DLln0MhfJZKXW', 'residente',
     (SELECT id FROM becados WHERE rut = '1234567-4'))
ON CONFLICT (rut) DO NOTHING;

-- Turnos disponibles (los que en el futuro creará el admin desde la web).
INSERT INTO turnos_disponibles
  (nombre, "fechaInicio", "fechaFin", "horaInicio", "horaFin", comidas, "diasNoDisponibles", "excluirFeriados", especialidades)
SELECT t.nombre, t.inicio, t.fin, t.hi, t.hf, t.comidas, t.dias, t.feriados, t.especialidades
FROM (VALUES
  -- Pediatría y Medicina Interna, de lunes a viernes, sin feriados
  ('Turno diurno (prueba)', CURRENT_DATE, NULL::date, '08:00', '18:00',
     ARRAY['almuerzo','once']::varchar[], ARRAY['sabado','domingo']::varchar[], true,
     ARRAY['Pediatría','Medicina Interna']::varchar[]),
  -- Pediatría y Cirugía, solo fines de semana, todas las comidas
  ('Guardia de 24 h (prueba)', CURRENT_DATE, NULL::date, '08:00', '08:00',
     ARRAY['desayuno','almuerzo','once','cena']::varchar[],
     ARRAY['lunes','martes','miercoles','jueves','viernes']::varchar[], false,
     ARRAY['Pediatría','Cirugía General']::varchar[]),
  -- Solo Pediatría, cualquier día, vigente 20 días
  ('Turno noche (prueba)', CURRENT_DATE, CURRENT_DATE + 20, '20:00', '08:00',
     ARRAY['desayuno','cena']::varchar[], ARRAY[]::varchar[], false,
     ARRAY['Pediatría']::varchar[]),
  -- Solo Cirugía General
  ('Turno pabellón (prueba)', CURRENT_DATE, NULL::date, '07:00', '15:00',
     ARRAY['almuerzo']::varchar[], ARRAY['domingo']::varchar[], false,
     ARRAY['Cirugía General']::varchar[])
) AS t(nombre, inicio, fin, hi, hf, comidas, dias, feriados, especialidades)
WHERE NOT EXISTS (SELECT 1 FROM turnos_disponibles d WHERE d.nombre = t.nombre);

-- Un feriado de prueba en un día hábil dentro de los próximos días (se ve como "Fer." en el calendario).
INSERT INTO feriados (fecha, nombre)
SELECT d::date, 'Feriado de prueba'
FROM generate_series(CURRENT_DATE + 8, CURRENT_DATE + 14, interval '1 day') AS d
WHERE extract(isodow FROM d) < 6
  AND NOT EXISTS (SELECT 1 FROM feriados WHERE nombre = 'Feriado de prueba')
LIMIT 1
ON CONFLICT (fecha) DO NOTHING;

-- Un pedido ya agendado para la residente de Pediatría (para probar "Cambiar un pedido"):
-- "Turno diurno" el primer día hábil desde pasado mañana + 1 (cumple 24 h de anticipación).
DO $$
DECLARE
  v_becado   int  := (SELECT id FROM becados WHERE rut = '12345678-5');
  v_turno    int  := (SELECT id FROM turnos_disponibles WHERE nombre = 'Turno diurno (prueba)');
  v_hospital int  := (SELECT id FROM hospitales WHERE nombre = 'La Serena');
  v_fecha    date := (SELECT d::date
                      FROM generate_series(CURRENT_DATE + 3, CURRENT_DATE + 10, interval '1 day') AS d
                      WHERE extract(isodow FROM d) < 6
                        AND d::date NOT IN (SELECT fecha FROM feriados)
                      ORDER BY d LIMIT 1);
BEGIN
  IF EXISTS (SELECT 1 FROM pedidos WHERE "becadoId" = v_becado AND estado <> 'cancelado' AND fecha >= CURRENT_DATE) THEN
    RAISE NOTICE 'La residente de prueba ya tiene pedidos próximos: no se crea otro.';
    RETURN;
  END IF;

  INSERT INTO turnos ("becadoId", fecha, tipo)
  VALUES (v_becado, v_fecha, 'normal')
  ON CONFLICT DO NOTHING;

  -- Precio vigente según la configuración (o los valores por defecto si aún no existe la fila).
  INSERT INTO pedidos ("becadoId", "hospitalId", "turnoDisponibleId", fecha, "tipoComida", estado, "valorUnitario")
  SELECT v_becado, v_hospital, v_turno, v_fecha, c.tipo, 'pendiente',
         CASE c.tipo
           WHEN 'almuerzo' THEN COALESCE((SELECT "costoAlmuerzo" FROM configuracion WHERE id = 1), 6500)
           ELSE COALESCE((SELECT "costoOnce" FROM configuracion WHERE id = 1), 3800)
         END
  FROM (VALUES ('almuerzo'), ('once')) AS c(tipo)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Pedido de prueba creado para el %', v_fecha;
END $$;

COMMIT;

-- Resumen de lo que quedó
SELECT 'becados' AS tabla, count(*) FROM becados
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
UNION ALL SELECT 'turnos_disponibles', count(*) FROM turnos_disponibles
UNION ALL SELECT 'pedidos', count(*) FROM pedidos;
