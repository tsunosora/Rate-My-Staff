-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `absenHp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `absenHpPerangkat` VARCHAR(64) NULL,
    ADD COLUMN `absenHpPerangkatAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `AbsenLokasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `radiusM` INTEGER NOT NULL DEFAULT 100,
    `wajibQr` BOOLEAN NOT NULL DEFAULT false,
    `qrRahasia` VARCHAR(64) NOT NULL,
    `layarToken` VARCHAR(36) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AbsenLokasi_layarToken_key`(`layarToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsenHpBukti` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendanceId` INTEGER NULL,
    `employeeId` INTEGER NOT NULL,
    `lokasiId` INTEGER NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `akurasiM` INTEGER NOT NULL,
    `jarakM` INTEGER NOT NULL,
    `fotoPath` VARCHAR(255) NOT NULL,
    `perangkat` VARCHAR(64) NOT NULL,
    `qr` BOOLEAN NOT NULL DEFAULT false,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AbsenHpBukti_attendanceId_key`(`attendanceId`),
    INDEX `AbsenHpBukti_employeeId_createdAt_idx`(`employeeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbsenHpBukti` ADD CONSTRAINT `AbsenHpBukti_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenHpBukti` ADD CONSTRAINT `AbsenHpBukti_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `AbsenLokasi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

