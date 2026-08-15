package com.ShivStore.ShiveStore.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import java.io.File;

@Service
public class S3StorageService {

    private static final Logger logger = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;

    @Value("${aws.s3.enabled:true}")
    private boolean s3Enabled;

    @Value("${aws.s3.bucket:}")
    private String bucketName;

    @Value("${aws.s3.backup-folder:backups}")
    private String backupFolder;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public boolean isS3Configured() {
        return s3Enabled && bucketName != null && !bucketName.isBlank();
    }

    /**
     * Uploads a file to the configured AWS S3 bucket.
     * 
     * @param file File to upload
     * @param fileName Name of the target file in S3
     * @return Upload result message or S3 object key on success
     */
    public String uploadBackupFile(File file, String fileName) {
        if (!isS3Configured()) {
            logger.warn("AWS S3 backup upload skipped: Bucket name is not configured (set AWS_S3_BUCKET_NAME env var).");
            return "SKIPPED_NOT_CONFIGURED";
        }

        String s3Key = backupFolder.endsWith("/") ? backupFolder + fileName : backupFolder + "/" + fileName;

        try {
            logger.info("Starting upload of {} ({}) to S3 bucket '{}' key '{}'", 
                    fileName, file.length() + " bytes", bucketName, s3Key);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("application/zip")
                    .build();

            PutObjectResponse response = s3Client.putObject(putObjectRequest, RequestBody.fromFile(file));

            logger.info("Successfully uploaded backup to S3! ETag: {}", response.eTag());
            return s3Key;
        } catch (Exception e) {
            logger.error("Failed to upload backup file '{}' to S3 bucket '{}': {}", fileName, bucketName, e.getMessage(), e);
            throw new RuntimeException("S3 Upload Failed: " + e.getMessage(), e);
        }
    }

    public String getBucketName() {
        return bucketName;
    }
}
