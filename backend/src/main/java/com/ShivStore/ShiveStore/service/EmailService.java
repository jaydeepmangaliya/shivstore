package com.ShivStore.ShiveStore.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    /**
     * Sends an HTML password reset email with the reset link.
     */
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        if (mailSender == null || fromEmail == null || fromEmail.isBlank()) {
            logger.warn("JavaMailSender or GMAIL_USERNAME is not configured. Reset link for {}: {}", toEmail, resetLink);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Reset Your SHIVSTORE Password");

            String htmlContent = """
                <div style="font-family: Arial, sans-serif; background-color: #0f1223; padding: 40px 20px; color: #ffffff;">
                    <div style="max-width: 500px; margin: 0 auto; background: #1a1e35; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #5c60f5, #7c84f9); border-radius: 50%; line-height: 50px; font-weight: bold; font-size: 24px; color: #fff;">S</div>
                            <h2 style="color: #ffffff; margin-top: 12px; margin-bottom: 4px;">SHIVSTORE</h2>
                            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Password Reset Request</p>
                        </div>
                        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">
                            Hello,
                        </p>
                        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">
                            We received a request to reset your password for your SHIVSTORE account. Click the button below to set a new password:
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="%s" style="background: linear-gradient(135deg, #5c60f5, #7c84f9); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Reset Password</a>
                        </div>
                        <p style="font-size: 13px; color: #94a3b8; line-height: 1.4;">
                            This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
                        </p>
                        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
                        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
                            © 2026 SHIVSTORE. All rights reserved.
                        </p>
                    </div>
                </div>
                """.formatted(resetLink);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            logger.info("Password reset email sent successfully to {}", toEmail);

        } catch (MessagingException e) {
            logger.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email: " + e.getMessage());
        }
    }
}
