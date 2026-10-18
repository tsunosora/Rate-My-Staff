-- Upah tukang (Tahap 1): tim tetap, tarif kota x divisi, proyek, rekap harian, penyesuaian &
-- pembayaran upah. Cuma MENAMBAH; kolom Employee baru semuanya boleh kosong.
-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `divisiBawaan` VARCHAR(100) NULL,
    ADD COLUMN `kotaBawaan` VARCHAR(100) NULL,
    ADD COLUMN `timId` INTEGER NULL,
    ADD COLUMN `upahHarian` DECIMAL(12, 2) NULL,
    ADD COLUMN `upahLemburPerJam` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `TimKerja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(80) NOT NULL,
    `picId` INTEGER NULL,
    `warna` VARCHAR(9) NOT NULL DEFAULT '#6366f1',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TimKerja_nama_key`(`nama`),
    UNIQUE INDEX `TimKerja_picId_key`(`picId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarifKotaDivisi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kota` VARCHAR(100) NOT NULL,
    `divisi` VARCHAR(100) NOT NULL,
    `upahHarian` DECIMAL(12, 2) NOT NULL,
    `lemburPerJam` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `catatan` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TarifKotaDivisi_kota_divisi_key`(`kota`, `divisi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProyekKerja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(30) NULL,
    `nama` VARCHAR(150) NOT NULL,
    `lokasi` VARCHAR(150) NULL,
    `mulai` DATETIME(3) NULL,
    `selesai` DATETIME(3) NULL,
    `upahHarian` DECIMAL(12, 2) NULL,
    `lemburPerJam` DECIMAL(12, 2) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'lokal',
    `refId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProyekKerja_aktif_idx`(`aktif`),
    UNIQUE INDEX `ProyekKerja_sumber_refId_key`(`sumber`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RekapHarian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'absen',
    `lemburJam` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `kota` VARCHAR(100) NULL,
    `divisi` VARCHAR(100) NULL,
    `proyekId` INTEGER NULL,
    `catatan` VARCHAR(255) NULL,
    `fotoPath` VARCHAR(255) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `akurasiM` INTEGER NULL,
    `dicatatOlehPicId` INTEGER NULL,
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'pic',
    `persetujuan` VARCHAR(20) NOT NULL DEFAULT 'menunggu',
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `alasanTolak` TEXT NULL,
    `upahKhusus` DECIMAL(12, 2) NULL,
    `upahKhususCatatan` VARCHAR(255) NULL,
    `pembayaranId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RekapHarian_tanggal_idx`(`tanggal`),
    INDEX `RekapHarian_persetujuan_tanggal_idx`(`persetujuan`, `tanggal`),
    INDEX `RekapHarian_dicatatOlehPicId_tanggal_idx`(`dicatatOlehPicId`, `tanggal`),
    UNIQUE INDEX `RekapHarian_employeeId_tanggal_key`(`employeeId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PenyesuaianUpah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `jenis` VARCHAR(20) NOT NULL,
    `jumlah` DECIMAL(12, 2) NOT NULL,
    `catatan` VARCHAR(255) NULL,
    `dibuatOlehId` INTEGER NULL,
    `pembayaranId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PenyesuaianUpah_employeeId_tanggal_idx`(`employeeId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PembayaranUpah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `periodeMulai` DATETIME(3) NOT NULL,
    `periodeSelesai` DATETIME(3) NOT NULL,
    `jumlah` DECIMAL(14, 2) NOT NULL,
    `rincian` JSON NOT NULL,
    `catatan` VARCHAR(255) NULL,
    `dibayarOlehId` INTEGER NULL,
    `dibayarAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PembayaranUpah_employeeId_periodeMulai_idx`(`employeeId`, `periodeMulai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_timId_fkey` FOREIGN KEY (`timId`) REFERENCES `TimKerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimKerja` ADD CONSTRAINT `TimKerja_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RekapHarian` ADD CONSTRAINT `RekapHarian_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RekapHarian` ADD CONSTRAINT `RekapHarian_dicatatOlehPicId_fkey` FOREIGN KEY (`dicatatOlehPicId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RekapHarian` ADD CONSTRAINT `RekapHarian_proyekId_fkey` FOREIGN KEY (`proyekId`) REFERENCES `ProyekKerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RekapHarian` ADD CONSTRAINT `RekapHarian_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RekapHarian` ADD CONSTRAINT `RekapHarian_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `PembayaranUpah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenyesuaianUpah` ADD CONSTRAINT `PenyesuaianUpah_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenyesuaianUpah` ADD CONSTRAINT `PenyesuaianUpah_pembayaranId_fkey` FOREIGN KEY (`pembayaranId`) REFERENCES `PembayaranUpah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PembayaranUpah` ADD CONSTRAINT `PembayaranUpah_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

