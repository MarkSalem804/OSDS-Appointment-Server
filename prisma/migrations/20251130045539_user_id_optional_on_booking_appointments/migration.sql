-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `appointment_userId_fkey`;

-- DropIndex
DROP INDEX `appointment_userId_fkey` ON `appointment`;

-- AlterTable
ALTER TABLE `appointment` ADD COLUMN `fullName` VARCHAR(191) NULL,
    MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `appointment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
