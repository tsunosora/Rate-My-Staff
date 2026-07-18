-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `machinePin` VARCHAR(50) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Employee_machinePin_key` ON `Employee`(`machinePin`);
