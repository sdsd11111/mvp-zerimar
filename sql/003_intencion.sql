-- Migración: agrega columna intencion a bot_conversaciones
-- Uso: npx tsx scripts/migrate.ts  (o corre este SQL en tu cliente MySQL)
SET NAMES utf8mb4;

ALTER TABLE bot_conversaciones
  ADD COLUMN IF NOT EXISTS intencion VARCHAR(160) NULL COMMENT 'Intención principal detectada por el bot'
  AFTER estado;
