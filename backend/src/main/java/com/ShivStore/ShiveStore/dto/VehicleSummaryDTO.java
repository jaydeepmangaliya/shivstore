package com.ShivStore.ShiveStore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleSummaryDTO {
    private String vehicleNumber;
    private long totalTrips;
    private double totalWeightKg;
    private double totalTons;
    private String lastDispatchDate;
    private Map<String, Double> materialBreakdownTons;
    private List<GatePassResponseDTO> recentDispatches;
}
