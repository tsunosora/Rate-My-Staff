-- CreateTable
CREATE TABLE `PointEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `omzet` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `omzetPoints` INTEGER NOT NULL DEFAULT 0,
    `jobPoints` INTEGER NOT NULL DEFAULT 0,
    `taskPoints` INTEGER NOT NULL DEFAULT 0,
    `attendancePoints` INTEGER NOT NULL DEFAULT 0,
    `points` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PointEntry_date_idx`(`date`),
    UNIQUE INDEX `PointEntry_employeeId_date_key`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('cash', 'product', 'voucher') NOT NULL DEFAULT 'product',
    `pointCost` INTEGER NOT NULL,
    `cashValue` DECIMAL(15, 2) NULL,
    `stock` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Reward_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PointRedemption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `rewardId` INTEGER NULL,
    `rewardName` VARCHAR(150) NOT NULL,
    `pointCost` INTEGER NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    `note` TEXT NULL,
    `decisionNote` TEXT NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PointRedemption_employeeId_idx`(`employeeId`),
    INDEX `PointRedemption_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PointEntry` ADD CONSTRAINT `PointEntry_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointRedemption` ADD CONSTRAINT `PointRedemption_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointRedemption` ADD CONSTRAINT `PointRedemption_rewardId_fkey` FOREIGN KEY (`rewardId`) REFERENCES `Reward`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointRedemption` ADD CONSTRAINT `PointRedemption_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

