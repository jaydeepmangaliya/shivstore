package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.dto.AuthRequest;
import com.ShivStore.ShiveStore.dto.AuthResponse;
import com.ShivStore.ShiveStore.dto.RegisterRequest;
import com.ShivStore.ShiveStore.model.PasswordResetToken;
import com.ShivStore.ShiveStore.model.User;
import com.ShivStore.ShiveStore.repository.PasswordResetTokenRepository;
import com.ShivStore.ShiveStore.repository.UserRepository;
import com.ShivStore.ShiveStore.security.JwtUtil;
import com.ShivStore.ShiveStore.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ── Register ──────────────────────────────────────────────────────────

    /**
     * POST /api/auth/register
     * Body: { "name": "John Doe", "email": "john@example.com", "password":
     * "secret123" }
     * Returns: { "token": "...", "name": "John Doe", "email": "...", "role": "Store
     * Manager", "expiresAt": <epoch ms> }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        // ── Validate inputs ───────────────────────────────────────────────
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Full name is required"));
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        // Normalise email
        String email = request.getEmail().trim().toLowerCase();

        // ── Check duplicate ───────────────────────────────────────────────
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with this email already exists"));
        }

        // ── Create user with BCrypt-hashed password ───────────────────────
        User newUser = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword())) // BCrypt hash
                .role("Store Manager")
                .build();

        userRepository.save(newUser);

        // ── Issue JWT ─────────────────────────────────────────────────────
        String token = jwtUtil.generateToken(email, newUser.getRole());
        long expiresAt = jwtUtil.getExpirationMs();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(token, newUser.getName(), email, newUser.getRole(), expiresAt));
    }

    // ── Login ─────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/login
     * Body: { "email": "john@example.com", "password": "secret123" }
     * Returns: { "token": "...", "name": "...", "email": "...", "role": "...",
     * "expiresAt": <epoch ms> }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {

        // ── Validate inputs ───────────────────────────────────────────────
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
        }

        String email = request.getEmail().trim().toLowerCase();

        // ── Look up user by email ─────────────────────────────────────────
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        User user = userOpt.get();

        // ── Verify BCrypt hash ────────────────────────────────────────────
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        // ── Issue JWT ─────────────────────────────────────────────────────
        String token = jwtUtil.generateToken(email, user.getRole());
        long expiresAt = jwtUtil.getExpirationMs();

        return ResponseEntity.ok(new AuthResponse(token, user.getName(), email, user.getRole(), expiresAt));
    }

    // ── Forgot Password ───────────────────────────────────────────────────

    /**
     * POST /api/auth/forgot-password
     * Body: { "email": "user@example.com" }
     * Sends a password reset email if the email exists.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email address is required"));
        }

        email = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(email);

        // Always return success message for security (prevents email enumeration)
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "If an account exists for that email, a password reset link has been sent."));
        }

        // Delete any existing reset tokens for this email
        tokenRepository.deleteByEmail(email);

        // Generate a new 15-minute reset token
        String tokenStr = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(tokenStr)
                .email(email)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();

        tokenRepository.save(resetToken);

        // Construct reset link
        String resetLink = "http://localhost:5173/reset-password?token=" + tokenStr;

        try {
            emailService.sendPasswordResetEmail(email, resetLink);
        } catch (Exception e) {
            // Log error but return user friendly message
        }

        return ResponseEntity.ok(Map.of("message", "If an account exists for that email, a password reset link has been sent."));
    }

    // ── Reset Password ────────────────────────────────────────────────────

    /**
     * POST /api/auth/reset-password
     * Body: { "token": "...", "newPassword": "..." }
     * Resets user password using the valid reset token.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reset token is required"));
        }
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters long"));
        }

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        PasswordResetToken resetToken = tokenOpt.get();
        if (resetToken.isUsed() || resetToken.isExpired()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired reset token"));
        }

        Optional<User> userOpt = userRepository.findByEmail(resetToken.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in with your new password."));
    }
}

