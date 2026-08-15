package com.ShivStore.ShiveStore.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class AwsS3Config {

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Value("${aws.s3.access-key:}")
    private String accessKey;

    @Value("${aws.s3.secret-key:}")
    private String secretKey;

    @Bean
    public S3Client s3Client() {
        Region awsRegion = Region.of(region != null && !region.isBlank() ? region : "us-east-1");

        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
            return S3Client.builder()
                    .region(awsRegion)
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
        }

        // Fallback to AWS Default Credentials Provider Chain (Env vars, IAM Role, ECS/EKS task role)
        return S3Client.builder()
                .region(awsRegion)
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
