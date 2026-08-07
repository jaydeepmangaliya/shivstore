package com.ShivStore.ShiveStore;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    private static final String DEFAULT_ATLAS_URI = "mongodb+srv://brandstore111111_db_user:1pLQbJVtQXEY070x@cluster0.b146y9k.mongodb.net/shiv_store_db?retryWrites=true&w=majority";

    @Value("${SPRING_DATA_MONGODB_URI:}")
    private String springDataUri;

    @Value("${MONGODB_URI:}")
    private String mongodbUri;

    @Bean
    public MongoClient mongoClient() {
        String finalUri = springDataUri;
        if (finalUri == null || finalUri.isBlank()) {
            finalUri = mongodbUri;
        }
        if (finalUri == null || finalUri.isBlank() || finalUri.contains("localhost")) {
            log.info("No valid MongoDB URI provided or fallback to localhost detected. Using MongoDB Atlas connection string.");
            finalUri = DEFAULT_ATLAS_URI;
        } else {
            log.info("Connecting to MongoDB with configured URI.");
        }

        ConnectionString connectionString = new ConnectionString(finalUri);
        MongoClientSettings mongoClientSettings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .build();

        return MongoClients.create(mongoClientSettings);
    }
}
