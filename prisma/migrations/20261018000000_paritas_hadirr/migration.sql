-- Paritas Hadirr: pengajuan lembur, jadwal shift per tanggal, absen HP di luar lokasi
-- menunggu persetujuan, reimbursement, kunjungan klien, timesheet. Cuma MENAMBAH; baris
-- AbsenHpBukti lama otomatis berstatus "diterima".
-- AlterTable
ALTER TABLE `AbsenHpBukti` ADD COLUMN `alasan` TEXT NULL,
    ADD COLUMN `catatanKeputusan` TEXT NULL,
    ADD COLUMN `decidedAt` DATETIME(3) NULL,
    ADD COLUMN `decidedById` INTEGER NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'diterima';

-- CreateTable
CREATE TABLE `PengajuanLembur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `mulai` VARCHAR(5) NULL,
    `selesai` VARCHAR(5) NULL,
    `menit` INTEGER NOT NULL,
    `alasan` TEXT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'portal',
    `menitDisetujui` INTEGER NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `catatanKeputusan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PengajuanLembur_employeeId_tanggal_idx`(`employeeId`, `tanggal`),
    INDEX `PengajuanLembur_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JadwalShift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `workScheduleId` INTEGER NULL,
    `libur` BOOLEAN NOT NULL DEFAULT false,
    `catatan` VARCHAR(255) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JadwalShift_tanggal_idx`(`tanggal`),
    UNIQUE INDEX `JadwalShift_employeeId_tanggal_key`(`employeeId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reimbursement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `kategori` VARCHAR(30) NOT NULL DEFAULT 'lainnya',
    `jumlah` DECIMAL(15, 2) NOT NULL,
    `keterangan` TEXT NOT NULL,
    `fotoPath` VARCHAR(255) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'menunggu',
    `jumlahDisetujui` DECIMAL(15, 2) NULL,
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'portal',
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `catatanKeputusan` TEXT NULL,
    `dibayarAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reimbursement_employeeId_tanggal_idx`(`employeeId`, `tanggal`),
    INDEX `Reimbursement_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KunjunganKlien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `namaKlien` VARCHAR(150) NOT NULL,
    `alamat` VARCHAR(255) NULL,
    `tujuan` VARCHAR(255) NULL,
    `masukAt` DATETIME(3) NOT NULL,
    `masukLat` DOUBLE NOT NULL,
    `masukLng` DOUBLE NOT NULL,
    `masukAkurasiM` INTEGER NOT NULL,
    `masukFoto` VARCHAR(255) NULL,
    `keluarAt` DATETIME(3) NULL,
    `keluarLat` DOUBLE NULL,
    `keluarLng` DOUBLE NULL,
    `keluarAkurasiM` INTEGER NULL,
    `hasil` VARCHAR(30) NULL,
    `catatan` TEXT NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KunjunganKlien_employeeId_masukAt_idx`(`employeeId`, `masukAt`),
    INDEX `KunjunganKlien_masukAt_idx`(`masukAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimesheetEntri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `mulai` VARCHAR(5) NOT NULL,
    `selesai` VARCHAR(5) NOT NULL,
    `menit` INTEGER NOT NULL,
    `proyek` VARCHAR(100) NOT NULL,
    `kegiatan` VARCHAR(255) NOT NULL,
    `catatan` TEXT NULL,
    `sumber` VARCHAR(20) NOT NULL DEFAULT 'portal',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TimesheetEntri_employeeId_tanggal_idx`(`employeeId`, `tanggal`),
    INDEX `TimesheetEntri_proyek_idx`(`proyek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AbsenHpBukti_status_idx` ON `AbsenHpBukti`(`status`);

-- AddForeignKey
ALTER TABLE `AbsenHpBukti` ADD CONSTRAINT `AbsenHpBukti_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanLembur` ADD CONSTRAINT `PengajuanLembur_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanLembur` ADD CONSTRAINT `PengajuanLembur_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalShift` ADD CONSTRAINT `JadwalShift_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalShift` ADD CONSTRAINT `JadwalShift_workScheduleId_fkey` FOREIGN KEY (`workScheduleId`) REFERENCES `WorkSchedule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reimbursement` ADD CONSTRAINT `Reimbursement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reimbursement` ADD CONSTRAINT `Reimbursement_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KunjunganKlien` ADD CONSTRAINT `KunjunganKlien_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimesheetEntri` ADD CONSTRAINT `TimesheetEntri_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

