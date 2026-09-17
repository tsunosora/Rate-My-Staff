-- AlterTable
ALTER TABLE `Attendance` ADD COLUMN `machineId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Machine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sn` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Machine_sn_key`(`sn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MachineEnrollment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `machineId` INTEGER NOT NULL,
    `pin` VARCHAR(50) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `deviceName` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MachineEnrollment_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `MachineEnrollment_machineId_pin_key`(`machineId`, `pin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attendance_machineId_idx` ON `Attendance`(`machineId`);

-- AddForeignKey
ALTER TABLE `MachineEnrollment` ADD CONSTRAINT `MachineEnrollment_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `Machine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MachineEnrollment` ADD CONSTRAINT `MachineEnrollment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `Machine`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
