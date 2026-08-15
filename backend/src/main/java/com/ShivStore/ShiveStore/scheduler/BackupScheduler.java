package com.ShivStore.ShiveStore.scheduler;

import com.ShivStore.ShiveStore.service.DatabaseBackupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BackupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(BackupScheduler.class);

    private final DatabaseBackupService databaseBackupService;

    @Autowired
    public BackupScheduler(DatabaseBackupService databaseBackupService) {
        this.databaseBackupService = databaseBackupService;
    }

    /**
     * Cron expression: "0 0 0 * * ?"
     * Fires every night at 12:00:00 AM (midnight).
     * Configurable via 'backup.cron' property or BACKUP_CRON_EXPRESSION env variable.
     */
    @Scheduled(cron = "${backup.cron:0 0 0 * * ?}")
    public void scheduleNightlyBackup() {
        logger.info("⏰ Nightly Scheduled Database Backup triggered at 12:00 AM!");
        try {
            DatabaseBackupService.BackupResult result = databaseBackupService.performBackup();
            if (result.isSuccess()) {
                logger.info("✅ Nightly Database Backup succeeded! S3 Location: {}, Size: {} bytes, Collections: {}",
                        result.getS3Path(), result.getFileSizeBytes(), result.getCollectionsCount());
            } else {
                logger.error("❌ Nightly Database Backup failed: {}", result.getMessage());
            }
        } catch (Exception e) {
            logger.error("❌ Unhandled exception during scheduled nightly backup: {}", e.getMessage(), e);
        }
    }
}
