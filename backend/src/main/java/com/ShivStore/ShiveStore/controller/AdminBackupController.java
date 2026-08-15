package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.service.DatabaseBackupService;
import com.ShivStore.ShiveStore.service.S3StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@CrossOrigin(origins = "*")
public class AdminBackupController {

    private final DatabaseBackupService databaseBackupService;
    private final S3StorageService s3StorageService;

    @Autowired
    public AdminBackupController(DatabaseBackupService databaseBackupService, S3StorageService s3StorageService) {
        this.databaseBackupService = databaseBackupService;
        this.s3StorageService = s3StorageService;
    }

    /**
     * Manually triggers database backup and S3 upload on demand.
     * Supports both GET and POST requests so it can be called via curl, browser URL, or HTTP client.
     * Endpoints: GET/POST /api/backup/trigger or /api/backup/manual
     */
    @RequestMapping(value = {"/trigger", "/manual"}, method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<DatabaseBackupService.BackupResult> triggerBackup() {
        DatabaseBackupService.BackupResult result = databaseBackupService.performBackup();
        if (result.isSuccess()) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.internalServerError().body(result);
        }
    }

    /**
     * Checks S3 backup configuration status.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getBackupStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("s3Configured", s3StorageService.isS3Configured());
        status.put("s3Bucket", s3StorageService.getBucketName());
        status.put("scheduleCron", "0 0 0 * * ? (12:00 AM Midnight Daily)");
        return ResponseEntity.ok(status);
    }
}
