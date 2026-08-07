package com.ShivStore.ShiveStore.service;

import com.ShivStore.ShiveStore.dto.GatePassRequestDTO;
import com.ShivStore.ShiveStore.dto.GatePassResponseDTO;
import com.ShivStore.ShiveStore.dto.VehicleSummaryDTO;

import java.util.List;

/**
 * Service Interface — Interface Segregation + Dependency Inversion.
 * Controller depends on this abstraction, never on the concrete implementation.
 * This makes the service fully testable with mocks.
 */
public interface GatePassService {

    /**
     * Create a new gate pass and persist to DB.
     * passNo is assigned by the injected GatePassNumberStrategy.
     */
    GatePassResponseDTO create(GatePassRequestDTO request);

    /**
     * Update an existing gate pass by its DB id.
     */
    GatePassResponseDTO update(String id, GatePassRequestDTO request);

    /**
     * Retrieve all gate passes, newest first.
     */
    List<GatePassResponseDTO> findAll();

    /**
     * Find a single gate pass by DB id.
     */
    GatePassResponseDTO findById(String id);

    /**
     * Delete a gate pass by DB id.
     */
    void delete(String id);

    /**
     * Search + filter gate passes.
     *
     * @param q    search term (party name or vehicle number), nullable/empty = no
     *             filter
     * @param date date string DD/MM/YYYY, nullable/empty = no filter
     */
    List<GatePassResponseDTO> search(String q, String date);

    /**
     * Get the next auto-incrementing pass number from the DB without saving.
     */
    int getNextPassNo();

    /** Count gate passes for a party with optional date filter (DD/MM/YYYY or YYYY-MM-DD). */
    long countByParty(String partyName, String startDate, String endDate);

    /** Bulk delete all gate passes for a party with optional date filter. */
    int deleteByParty(String partyName, String startDate, String endDate);

    /** Get aggregated transport summary per vehicle with optional date range and search query. */
    List<VehicleSummaryDTO> getVehicleSummaries(String startDate, String endDate, String q);
}
