-- Relación Reminder -> Customer, para poder mostrar el destinatario
-- en el historial de recordatorios del panel.

-- Limpia referencias huérfanas antes de crear la FK (recordatorios cuyo
-- cliente ya fue borrado quedarían inconsistentes).
UPDATE "Reminder" r
SET "customerId" = NULL
WHERE r."customerId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = r."customerId");

ALTER TABLE "Reminder"
  ADD CONSTRAINT "Reminder_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Reminder_customerId_idx" ON "Reminder"("customerId");
