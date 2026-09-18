-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `posproUserId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_posproUserId_key` ON `Employee`(`posproUserId`);

