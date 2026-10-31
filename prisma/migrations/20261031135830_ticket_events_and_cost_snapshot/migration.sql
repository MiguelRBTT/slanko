-- Snapshot do custo/hora em cada apontamento (rentabilidade não muda se o custo do usuário mudar depois).
-- AlterTable
ALTER TABLE `time_entries` ADD COLUMN `hourly_cost` DECIMAL(10, 2) NULL;

-- Backfill: apontamentos existentes recebem o custo/hora atual do colaborador.
UPDATE `time_entries` te
  JOIN `users` u ON u.`id` = te.`user_id`
  SET te.`hourly_cost` = u.`hourly_cost`;

ALTER TABLE `time_entries` MODIFY `hourly_cost` DECIMAL(10, 2) NOT NULL;

-- Histórico auditável do chamado (RF07).
-- CreateTable
CREATE TABLE `ticket_events` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'OBSERVERS_CHANGED', 'TIME_LOGGED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED') NOT NULL,
    `data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_events_ticket_id_created_at_idx`(`ticket_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_events` ADD CONSTRAINT `ticket_events_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_events` ADD CONSTRAINT `ticket_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: chamados e apontamentos já existentes ganham os eventos iniciais do histórico.
INSERT INTO `ticket_events` (`id`, `ticket_id`, `actor_id`, `type`, `data`, `created_at`)
SELECT UUID(), t.`id`, t.`opened_by_id`, 'CREATED', JSON_OBJECT('backfilled', TRUE), t.`opened_at`
FROM `tickets` t;

INSERT INTO `ticket_events` (`id`, `ticket_id`, `actor_id`, `type`, `data`, `created_at`)
SELECT UUID(), te.`ticket_id`, te.`user_id`, 'TIME_LOGGED',
       JSON_OBJECT('timeEntryId', te.`id`, 'hours', CAST(te.`hours` AS CHAR), 'backfilled', TRUE),
       te.`created_at`
FROM `time_entries` te;
