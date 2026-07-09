-- Migration: Workouts multi-day — day_of_week INT -> INT[]
-- Un template puede repetirse en varios días (mismo criterio que
-- habits.active_days). Array vacío = "cualquier día" (reemplaza el NULL
-- usado desde 003_workouts_v2).

ALTER TABLE workouts ALTER COLUMN day_of_week TYPE INT[] USING (
  CASE WHEN day_of_week IS NULL THEN '{}'::INT[] ELSE ARRAY[day_of_week] END
);
ALTER TABLE workouts ALTER COLUMN day_of_week SET DEFAULT '{}';
ALTER TABLE workouts ALTER COLUMN day_of_week SET NOT NULL;

-- El CHECK original (BETWEEN 1 AND 7, para un INT escalar) ya no aplica a
-- un arreglo; se recrea validando que cada elemento esté en rango 1-7.
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_day_of_week_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_day_of_week_check
  CHECK (day_of_week <@ ARRAY[1,2,3,4,5,6,7]);

-- El índice de "un día" ya no representa bien un arreglo, y la app no hace
-- filtrado de día en el servidor (todo es client-side sobre la lista ya
-- cargada) — se elimina en vez de mantenerlo sin propósito real.
DROP INDEX IF EXISTS idx_workouts_user_day;
