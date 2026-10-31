-- Metas de SLA congeladas no chamado (copiadas do contrato na abertura).
-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `response_minutes` INTEGER NULL,
    ADD COLUMN `resolution_minutes` INTEGER NULL;

-- Backfill: chamados existentes recebem as metas atuais do contrato.
UPDATE `tickets` t
  JOIN `contracts` c ON c.`id` = t.`contract_id`
  SET t.`response_minutes` = c.`response_minutes`,
      t.`resolution_minutes` = c.`resolution_minutes`;

ALTER TABLE `tickets` MODIFY `response_minutes` INTEGER NOT NULL,
    MODIFY `resolution_minutes` INTEGER NOT NULL;

-- Índices documentados na modelagem (filtros por situação e período).
-- CreateIndex
CREATE INDEX `contracts_status_idx` ON `contracts`(`status`);

-- CreateIndex
CREATE INDEX `tickets_status_idx` ON `tickets`(`status`);

-- CreateIndex
CREATE INDEX `tickets_opened_at_idx` ON `tickets`(`opened_at`);

-- CreateIndex
CREATE INDEX `time_entries_worked_at_idx` ON `time_entries`(`worked_at`);
