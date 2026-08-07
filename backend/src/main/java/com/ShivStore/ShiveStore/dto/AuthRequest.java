package com.ShivStore.ShiveStore.dto;

import lombok.Data;

@Data
public class AuthRequest {
    /** Email address used as the login identifier */
    private String email;
    private String password;
}
