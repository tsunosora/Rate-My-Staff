-- CreateTable
CREATE TABLE `FingerspotPerintah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machineId` INTEGER NOT NULL,
    `transId` VARCHAR(40) NOT NULL,
    `cmdCode` VARCHAR(40) NOT NULL,
    `body` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'menunggu',
    `kodeBalasan` VARCHAR(60) NULL,
    `hasil` JSON NULL,
    `catatan` VARCHAR(255) NULL,
    `dibuatOleh` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dikirimAt` DATETIME(3) NULL,
    `selesaiAt` DATETIME(3) NULL,

    UNIQUE INDEX `FingerspotPerintah_transId_key`(`transId`),
    INDEX `FingerspotPerintah_machineId_status_idx`(`machineId`, `status`),
    INDEX `FingerspotPerintah_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FingerspotPerintah` ADD CONSTRAINT `FingerspotPerintah_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `Machine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

