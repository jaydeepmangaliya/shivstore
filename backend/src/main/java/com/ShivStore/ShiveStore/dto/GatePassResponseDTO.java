package com.ShivStore.ShiveStore.dto;

import com.ShivStore.ShiveStore.model.GatePass;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO Pattern — Outbound response payload.
 * Maps GatePass entity → response JSON.
 * Clients only see what we expose (no JPA internals leak out).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatePassResponseDTO {

    private String id;
    private Integer passNo;
    private String date;
    private String partyName;
    private String vehicleNumber;
    private String materials;
    private String time;
    private String timePeriod;
    private Double loadWeight;
    private Double emptyWeight;
    private Double netWeight;
    private Double netTons;
    private String villageName;
    private String gatePassSignature;
    private LocalDateTime createdAt;

    /**
     * Static factory / Builder-style mapper.
     * Keeps mapping logic inside the DTO (SRP).
     */
    public static GatePassResponseDTO from(GatePass entity) {
        return GatePassResponseDTO.builder()
                .id(entity.getId())
                .passNo(entity.getPassNo())
                .date(entity.getDate())
                .partyName(entity.getPartyName())
                .vehicleNumber(entity.getVehicleNumber())
                .materials(entity.getMaterials())
                .time(entity.getTime())
                .timePeriod(entity.getTimePeriod())
                .loadWeight(entity.getLoadWeight())
                .emptyWeight(entity.getEmptyWeight())
                .netWeight(entity.getNetWeight())
                .netTons(entity.getNetTons())
                .villageName(entity.getVillageName())
                .gatePassSignature(entity.getGatePassSignature())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
