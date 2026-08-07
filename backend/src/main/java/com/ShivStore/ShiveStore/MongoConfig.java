package com.ShivStore.ShiveStore;

import com.mongodb.ConnectionString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    private static final String DEFAULT_ATLAS_URI = "mongodb+srv://brandstore111111_db_user:1pLQbJVtQXEY070x@cluster0.b146y9k.mongodb.net/shiv_store_db?retryWrites=true&w=majority";

    @Value("${SPRING_DATA_MONGODB_URI:}")
    private String springDataUri;

    @Value("${MONGODB_URI:}")
    private String mongodbUri;

    @Bean
    public MongoDatabaseFactory mongoDatabaseFactory() {
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
        String databaseName = connectionString.getDatabase();
        if (databaseName == null || databaseName.isBlank()) {
            databaseName = "shiv_store_db";
            // Append default database name if missing from URI
            if (!finalUri.contains("?")) {
                finalUri = finalUri + "/shiv_store_db";
            } else {
                finalUri = finalUri.replace("?", "/shiv_store_db?");
            }
        }

        log.info("Initializing MongoDatabaseFactory for database: {}", databaseName);
        return new SimpleMongoClientDatabaseFactory(finalUri);
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory) {
        return new MongoTemplate(mongoDatabaseFactory);
    }
}
