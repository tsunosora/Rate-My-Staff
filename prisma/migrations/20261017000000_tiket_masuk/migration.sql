-- Tiket masuk qendali.com (qm1): jti sekali pakai — peramban (/masuk-qendali) & aplikasi HP Owner.
CREATE TABLE `TiketMasukTerpakai` (
    `jti` VARCHAR(64) NOT NULL,
    `kedaluwarsaPada` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TiketMasukTerpakai_kedaluwarsaPada_idx`(`kedaluwarsaPada`),
    PRIMARY KEY (`jti`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
