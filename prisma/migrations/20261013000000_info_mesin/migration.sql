-- Info Mesin: alamat (Host) & IP publik pada kontak terakhir mesin.
ALTER TABLE `Machine` ADD COLUMN `lastHost` VARCHAR(255) NULL,
    ADD COLUMN `lastIp` VARCHAR(64) NULL;
