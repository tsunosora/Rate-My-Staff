-- Inventaris kantor: barang yang dipinjamkan ke karyawan (seragam, laptop, kunci, kartu ID).
-- CreateTable
CREATE TABLE `InventarisKantor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(150) NOT NULL,
    `kategori` VARCHAR(30) NOT NULL DEFAULT 'lainnya',
    `keterangan` VARCHAR(500) NULL,
    `jumlah` INTEGER NOT NULL DEFAULT 1,
    `rusakHilang` INTEGER NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventarisKantor_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeminjamanInventaris` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventarisId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `jumlah` INTEGER NOT NULL DEFAULT 1,
    `dipinjamPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dikembalikanPada` DATETIME(3) NULL,
    `kondisiKembali` VARCHAR(20) NULL,
    `catatan` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PeminjamanInventaris_inventarisId_dikembalikanPada_idx`(`inventarisId`, `dikembalikanPada`),
    INDEX `PeminjamanInventaris_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PeminjamanInventaris` ADD CONSTRAINT `PeminjamanInventaris_inventarisId_fkey` FOREIGN KEY (`inventarisId`) REFERENCES `InventarisKantor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeminjamanInventaris` ADD CONSTRAINT `PeminjamanInventaris_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
