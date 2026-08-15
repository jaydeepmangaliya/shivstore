package com.ShivStore.ShiveStore.service;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class DatabaseBackupService {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseBackupService.class);
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    private final MongoTemplate mongoTemplate;
    private final S3StorageService s3StorageService;

    @Autowired
    public DatabaseBackupService(MongoTemplate mongoTemplate, S3StorageService s3StorageService) {
        this.mongoTemplate = mongoTemplate;
        this.s3StorageService = s3StorageService;
    }

    public static class BackupResult {
        private boolean success;
        private String fileName;
        private String s3Path;
        private long fileSizeBytes;
        private int collectionsCount;
        private List<String> collectionNames;
        private long durationMs;
        private String message;
        private String timestamp;

        public BackupResult() {}

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getS3Path() { return s3Path; }
        public void setS3Path(String s3Path) { this.s3Path = s3Path; }
        public long getFileSizeBytes() { return fileSizeBytes; }
        public void setFileSizeBytes(long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }
        public int getCollectionsCount() { return collectionsCount; }
        public void setCollectionsCount(int collectionsCount) { this.collectionsCount = collectionsCount; }
        public List<String> getCollectionNames() { return collectionNames; }
        public void setCollectionNames(List<String> collectionNames) { this.collectionNames = collectionNames; }
        public long getDurationMs() { return durationMs; }
        public void setDurationMs(long durationMs) { this.durationMs = durationMs; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    /**
     * Performs MongoDB database backup, compresses into ZIP, uploads to S3, and cleans up local temp files.
     */
    public BackupResult performBackup() {
        long startTime = System.currentTimeMillis();
        String timestampStr = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        String backupName = "shivstore_db_backup_" + timestampStr;
        String zipFileName = backupName + ".zip";

        BackupResult result = new BackupResult();
        result.setTimestamp(timestampStr);
        result.setFileName(zipFileName);

        Path tempDir = null;
        File zipFile = null;

        try {
            logger.info("Starting database backup process at {}", timestampStr);

            // 1. Create temp working directory for collection dumps
            tempDir = Files.createTempDirectory("shivstore_backup_");
            Path dumpDir = tempDir.resolve(backupName);
            Files.createDirectories(dumpDir);

            // 2. Fetch all collections from MongoDB
            Set<String> collectionNames = mongoTemplate.getCollectionNames();
            List<String> dumpedCollections = new ArrayList<>();
            logger.info("Found {} collections to backup: {}", collectionNames.size(), collectionNames);

            for (String colName : collectionNames) {
                List<Document> documents = mongoTemplate.findAll(Document.class, colName);
                File colFile = dumpDir.resolve(colName + ".json").toFile();

                try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(colFile), StandardCharsets.UTF_8))) {
                    writer.write("[\n");
                    for (int i = 0; i < documents.size(); i++) {
                        writer.write("  ");
                        writer.write(documents.get(i).toJson());
                        if (i < documents.size() - 1) {
                            writer.write(",");
                        }
                        writer.write("\n");
                    }
                    writer.write("]\n");
                }

                dumpedCollections.add(colName);
                logger.debug("Dumped collection '{}' ({} documents) to JSON", colName, documents.size());
            }

            result.setCollectionsCount(dumpedCollections.size());
            result.setCollectionNames(dumpedCollections);

            // 3. Compress dumped JSON files into a single ZIP archive
            zipFile = tempDir.resolve(zipFileName).toFile();
            createZipArchive(dumpDir.toFile(), zipFile);
            result.setFileSizeBytes(zipFile.length());
            logger.info("Created backup ZIP archive '{}' ({} bytes)", zipFile.getName(), zipFile.length());

            // 4. Upload ZIP file to S3 bucket
            String s3Path = s3StorageService.uploadBackupFile(zipFile, zipFileName);
            result.setS3Path(s3Path);

            long duration = System.currentTimeMillis() - startTime;
            result.setDurationMs(duration);
            result.setSuccess(true);
            result.setMessage("Backup completed successfully in " + duration + " ms. S3 Location: " + s3Path);

            logger.info("Backup successfully completed in {} ms!", duration);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Database backup failed: {}", e.getMessage(), e);
            result.setSuccess(false);
            result.setDurationMs(duration);
            result.setMessage("Backup failed: " + e.getMessage());
        } finally {
            // 5. Cleanup temporary directory & local zip file
            cleanupTempFiles(tempDir);
        }

        return result;
    }

    private void createZipArchive(File folderToZip, File zipDestination) throws IOException {
        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipDestination))) {
            File[] files = folderToZip.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile()) {
                        try (FileInputStream fis = new FileInputStream(file)) {
                            ZipEntry zipEntry = new ZipEntry(file.getName());
                            zos.putNextEntry(zipEntry);
                            byte[] buffer = new byte[8192];
                            int length;
                            while ((length = fis.read(buffer)) >= 0) {
                                zos.write(buffer, 0, length);
                            }
                            zos.closeEntry();
                        }
                    }
                }
            }
        }
    }

    private void cleanupTempFiles(Path tempDir) {
        if (tempDir != null && Files.exists(tempDir)) {
            try {
                Files.walk(tempDir)
                        .sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
                logger.debug("Cleaned up temporary backup files in {}", tempDir);
            } catch (Exception e) {
                logger.warn("Failed to cleanup temp backup directory {}: {}", tempDir, e.getMessage());
            }
        }
    }
}
