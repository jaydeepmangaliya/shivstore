package com.ShivStore.ShiveStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.time.LocalDateTime;

/**
 * MongoDB document representing an application user.
 * Email is used as the unique login identifier.
 * Password is stored as a BCrypt hash — never plain text.
 */
@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    /** Full display name */
    private String name;

    /** Email — unique login identifier */
    @Indexed(unique = true)
    private String email;

    /** BCrypt-hashed password — plain text is NEVER stored */
    @JsonIgnore
    private String password;

    /** Role, e.g. "Store Manager" */
    private String role;

    /** Server-side creation timestamp */
    private LocalDateTime createdAt;
}
