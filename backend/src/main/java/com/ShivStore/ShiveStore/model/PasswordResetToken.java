package com.ShivStore.ShiveStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores a one-time password reset token.
 * Token expires after 15 minutes.
 */
@Document(collection = "password_reset_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    private String id;

    /** The reset token (UUID string) */
    @Indexed(unique = true)
    private String token;

    /** Email of the user requesting the reset */
    @Indexed
    private String email;

    /** When the token expires (15 minutes after creation) */
    private LocalDateTime expiresAt;

    /** Whether the token has already been used */
    private boolean used;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
