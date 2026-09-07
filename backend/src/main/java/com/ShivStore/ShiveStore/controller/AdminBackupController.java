package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.service.DatabaseBackupService;
import com.ShivStore.ShiveStore.service.S3StorageService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/backup")
@CrossOrigin(origins = "*")
public class AdminBackupController {

    private final DatabaseBackupService databaseBackupService;
    private final S3StorageService s3StorageService;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public AdminBackupController(DatabaseBackupService databaseBackupService, 
                                 S3StorageService s3StorageService,
                                 MongoTemplate mongoTemplate) {
        this.databaseBackupService = databaseBackupService;
        this.s3StorageService = s3StorageService;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Manually triggers database backup and S3 upload, and returns the backup data as a downloadable Excel (.xlsx) file.
     * Accessible by all authenticated users.
     * Endpoints: GET/POST /api/backup/trigger or /api/backup/manual
     */
    @RequestMapping(value = {"/trigger", "/manual"}, method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> triggerBackup(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Unauthorized - Authentication required");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        // 1. Perform S3 backup in the background/sync
        DatabaseBackupService.BackupResult s3BackupResult = databaseBackupService.performBackup();

        // 2. Generate and download Excel file
        try {
            byte[] excelBytes = generateDatabaseExcel();
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
            String fileName = "shivstore_backup_" + timestamp + ".xlsx";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            // Optionally attach information about the S3 backup to a custom response header
            if (s3BackupResult.isSuccess()) {
                headers.add("X-S3-Backup-Status", "SUCCESS");
                headers.add("X-S3-Backup-Location", s3BackupResult.getS3Path());
            } else {
                headers.add("X-S3-Backup-Status", "FAILED");
            }

            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to generate Excel backup: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Checks S3 backup configuration status.
     * Accessible by all authenticated users.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getBackupStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Unauthorized - Authentication required");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        Map<String, Object> status = new HashMap<>();
        status.put("s3Configured", s3StorageService.isS3Configured());
        status.put("s3Bucket", s3StorageService.getBucketName());
        status.put("scheduleCron", "0 0 0 * * ? (12:00 AM Midnight Daily)");
        return ResponseEntity.ok(status);
    }

    private byte[] generateDatabaseExcel() throws Exception {
        try (Workbook workbook = new XSSFWorkbook()) {
            Set<String> collections = mongoTemplate.getCollectionNames();
            for (String colName : collections) {
                if (colName.startsWith("system.")) {
                    continue;
                }

                Sheet sheet = workbook.createSheet(colName);
                List<Document> documents = mongoTemplate.findAll(Document.class, colName);

                if (documents.isEmpty()) {
                    Row row = sheet.createRow(0);
                    row.createCell(0).setCellValue("No data found in this collection");
                    continue;
                }

                // Gather headers
                Set<String> headers = new LinkedHashSet<>();
                headers.add("_id");
                for (Document doc : documents) {
                    headers.addAll(doc.keySet());
                }
                List<String> headerList = new ArrayList<>(headers);

                // Create header row
                Row headerRow = sheet.createRow(0);
                CellStyle headerStyle = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                headerStyle.setFont(font);

                // Apply simple background fill to header
                headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                for (int i = 0; i < headerList.size(); i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(headerList.get(i));
                    cell.setCellStyle(headerStyle);
                }

                // Populate data
                int rowIdx = 1;
                for (Document doc : documents) {
                    Row row = sheet.createRow(rowIdx++);
                    for (int colIdx = 0; colIdx < headerList.size(); colIdx++) {
                        String fieldName = headerList.get(colIdx);
                        Cell cell = row.createCell(colIdx);

                        // Redact passwords for users for security
                        if ("users".equalsIgnoreCase(colName) && "password".equalsIgnoreCase(fieldName)) {
                            cell.setCellValue("[REDACTED]");
                            continue;
                        }

                        Object val = doc.get(fieldName);
                        if (val != null) {
                            if (val instanceof Number) {
                                cell.setCellValue(((Number) val).doubleValue());
                            } else if (val instanceof Boolean) {
                                cell.setCellValue((Boolean) val);
                            } else {
                                cell.setCellValue(val.toString());
                            }
                        }
                    }
                }

                // Adjust column widths
                for (int i = 0; i < headerList.size(); i++) {
                    try {
                        sheet.autoSizeColumn(i);
                    } catch (Exception e) {
                        // fallback if auto-size fails in some headless environments
                    }
                }
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }
}
