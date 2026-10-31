-- Ordem determinística do histórico: eventos gravados na mesma alteração têm o mesmo horário.
-- AlterTable
ALTER TABLE `ticket_events` ADD COLUMN `sequence` INTEGER NULL;

-- Backfill na ordem cronológica dos eventos já existentes.
SET @seq := 0;
UPDATE `ticket_events` SET `sequence` = (@seq := @seq + 1) ORDER BY `created_at`, `id`;

-- CreateIndex + auto incremento para os próximos eventos.
ALTER TABLE `ticket_events`
  MODIFY `sequence` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `ticket_events_sequence_key`(`sequence`);
