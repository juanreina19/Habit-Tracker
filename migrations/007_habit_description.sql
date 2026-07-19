-- Migration: habits.description
-- La columna ya estaba en el CREATE TABLE base (supabase-schema.sql), pero
-- nunca tuvo una migración incremental propia (a diferencia de start_time,
-- que sí la tuvo) — esta migración es una red de seguridad idempotente para
-- cualquier entorno ya desplegado que no la tenga.

ALTER TABLE habits ADD COLUMN IF NOT EXISTS description TEXT;
