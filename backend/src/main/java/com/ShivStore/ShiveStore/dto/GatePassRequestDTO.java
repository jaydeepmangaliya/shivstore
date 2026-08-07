package com.ShivStore.ShiveStore.dto;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTO Pattern — Inbound request payload (create or update).
 * Decouples API contract from JPA entity.
 * Open/Closed: new fields can be added without modifying the service interface.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatePassRequestDTO {

    @NotBlank(message = "Party name is required")
    @Size(max = 100, message = "Party name must not exceed 100 characters")
    private String partyName;

    @NotBlank(message = "Vehicle number is required")
    private String vehicleNumber;

    @NotBlank(message = "Material is required")
    private String materials;

    @NotBlank(message = "Time is required")
    private String time;

    /** "AM" or "PM" */
    @NotBlank(message = "Time period (AM/PM) is required")
    private String timePeriod;

    /** Display date DD/MM/YYYY */
    private String date;

    @NotNull(message = "Load weight is required")
    @Positive(message = "Load weight must be positive")
    private Double loadWeight;

    @NotNull(message = "Empty weight is required")
    @Positive(message = "Empty weight must be positive")
    private Double emptyWeight;

    /** Village name of the party */
    private String villageName;

    /** Optional — defaults to "Shiv Stone (Auth)" on backend if blank */
    private String gatePassSignature;
}
