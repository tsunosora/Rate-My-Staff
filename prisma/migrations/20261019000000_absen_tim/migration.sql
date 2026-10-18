-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `bisaAbsenTim` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `didaftarkanOlehId` INTEGER NULL,
    ADD COLUMN `jenis` VARCHAR(20) NOT NULL DEFAULT 'tetap',
    ADD COLUMN `perluDiperiksa` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `SesiAbsenTim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `picId` INTEGER NOT NULL,
    `namaTempat` VARCHAR(150) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `akurasiM` INTEGER NOT NULL,
    `mulaiAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `catatan` TEXT NULL,
    `diberitahuAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SesiAbsenTim_picId_mulaiAt_idx`(`picId`, `mulaiAt`),
    INDEX `SesiAbsenTim_mulaiAt_idx`(`mulaiAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsenTimBaris` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sesiId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `jenis` VARCHAR(10) NOT NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `akurasiM` INTEGER NOT NULL,
    `fotoPath` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'menunggu',
    `attendanceId` INTEGER NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `catatanKeputusan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AbsenTimBaris_attendanceId_key`(`attendanceId`),
    INDEX `AbsenTimBaris_sesiId_status_idx`(`sesiId`, `status`),
    INDEX `AbsenTimBaris_employeeId_waktu_idx`(`employeeId`, `waktu`),
    INDEX `AbsenTimBaris_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_didaftarkanOlehId_fkey` FOREIGN KEY (`didaftarkanOlehId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesiAbsenTim` ADD CONSTRAINT `SesiAbsenTim_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenTimBaris` ADD CONSTRAINT `AbsenTimBaris_sesiId_fkey` FOREIGN KEY (`sesiId`) REFERENCES `SesiAbsenTim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenTimBaris` ADD CONSTRAINT `AbsenTimBaris_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenTimBaris` ADD CONSTRAINT `AbsenTimBaris_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

