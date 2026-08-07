package com.ShivStore.ShiveStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.*;

import java.time.LocalDateTime;

/**
 * MongoDB Document representing a Gate Pass record.
 */
@Document(collection = "gate_passes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatePass {

    @Id
    private String id;

    /** Unique human-readable pass number (e.g. 1001, 1002). */
    @Indexed(unique = true)
    private Integer passNo;

    /** Display date in DD/MM/YYYY format as shown on the form. */
    private String date;

    @Indexed
    private String partyName;

    @Indexed
    private String vehicleNumber;

    private String materials;

    /** Time string in HH:mm format, e.g. "10:30" */
    private String time;

    /** "AM" or "PM" */
    private String timePeriod;

    /** Gross / loaded weight in kg */
    private Double loadWeight;

    /** Tare / empty weight in kg */
    private Double emptyWeight;

    /** Net weight = loadWeight - emptyWeight (kg) */
    private Double netWeight;

    /** Net weight in metric tons (rounded to 2dp) */
    private Double netTons;

    private String villageName;

    /** Pre-filled authorisation signature text */
    private String gatePassSignature;

    /** Server-side creation timestamp (UTC). Used for ordering and dashboard stats. */
    @Indexed
    private LocalDateTime createdAt;
}
