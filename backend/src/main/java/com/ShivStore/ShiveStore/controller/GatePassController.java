package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.dto.GatePassRequestDTO;
import com.ShivStore.ShiveStore.dto.GatePassResponseDTO;
import com.ShivStore.ShiveStore.dto.VehicleSummaryDTO;
import com.ShivStore.ShiveStore.service.GatePassService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GatePassController — Facade Pattern.
 * Thin REST layer: validates input via @Valid, delegates all work to
 * GatePassService.
 * No business logic here (Single Responsibility).
 *
 * SOLID:
 * - S: Only HTTP request/response mapping
 * - D: Depends on GatePassService interface, not the implementation
 */
@RestController
@RequestMapping("/api/gatepasses")
@CrossOrigin(origins = "*")
public class GatePassController {

    private final GatePassService gatePassService;

    /** Constructor injection — testable without Spring context */
    public GatePassController(GatePassService gatePassService) {
        this.gatePassService = gatePassService;
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    /**
     * POST /api/gatepasses
     * Creates a new gate pass. Returns 201 Created with the persisted record.
     */
    @PostMapping
    public ResponseEntity<GatePassResponseDTO> create(@Valid @RequestBody GatePassRequestDTO request) {
        GatePassResponseDTO created = gatePassService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ─── READ ALL ─────────────────────────────────────────────────────────────

    /**
     * GET /api/gatepasses
     * Returns all gate passes ordered newest first.
     */
    @GetMapping
    public ResponseEntity<List<GatePassResponseDTO>> findAll() {
        return ResponseEntity.ok(gatePassService.findAll());
    }

    // ─── READ ONE ─────────────────────────────────────────────────────────────

    /**
     * GET /api/gatepasses/{id}
     * Returns a single gate pass by its DB id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<GatePassResponseDTO> findById(@PathVariable String id) {
        return ResponseEntity.ok(gatePassService.findById(id));
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    /**
     * PUT /api/gatepasses/{id}
     * Updates an existing gate pass. passNo and createdAt are preserved.
     */
    @PutMapping("/{id}")
    public ResponseEntity<GatePassResponseDTO> update(
            @PathVariable String id,
            @Valid @RequestBody GatePassRequestDTO request) {
        return ResponseEntity.ok(gatePassService.update(id, request));
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    /**
     * DELETE /api/gatepasses/{id}
     * Hard deletes a gate pass record.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        gatePassService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── SEARCH + FILTER ──────────────────────────────────────────────────────

    /**
     * GET /api/gatepasses/search?q=partyName&date=DD/MM/YYYY
     * Either or both params may be omitted to skip that filter.
     */
    @GetMapping("/search")
    public ResponseEntity<List<GatePassResponseDTO>> search(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "") String date) {
        return ResponseEntity.ok(gatePassService.search(q, date));
    }

    /**
     * GET /api/gatepasses/next-no
     * Returns the next auto-increment pass number.
     */
    @GetMapping("/next-no")
    public ResponseEntity<Map<String, Integer>> getNextPassNo() {
        return ResponseEntity.ok(Map.of("nextPassNo", gatePassService.getNextPassNo()));
    }

    // ─── VEHICLE SUMMARY ANALYTICS ───────────────────────────────────────────

    /**
     * GET /api/gatepasses/vehicles/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&q=...
     * Returns vehicle-wise transport summaries.
     */
    @GetMapping("/vehicles/summary")
    public ResponseEntity<List<VehicleSummaryDTO>> getVehicleSummaries(
            @RequestParam(required = false, defaultValue = "") String startDate,
            @RequestParam(required = false, defaultValue = "") String endDate,
            @RequestParam(required = false, defaultValue = "") String q) {
        return ResponseEntity.ok(gatePassService.getVehicleSummaries(startDate, endDate, q));
    }

    /**
     * GET /api/gatepasses/by-party/count?partyName=X&startDate=DD/MM/YYYY&endDate=DD/MM/YYYY
     * Preview count of matching passes.
     */
    @GetMapping("/by-party/count")
    public ResponseEntity<Map<String, Long>> countByParty(
            @RequestParam String partyName,
            @RequestParam(required = false, defaultValue = "") String startDate,
            @RequestParam(required = false, defaultValue = "") String endDate) {
        long count = gatePassService.countByParty(partyName, startDate, endDate);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * DELETE /api/gatepasses/by-party?partyName=X&startDate=DD/MM/YYYY&endDate=DD/MM/YYYY
     * Bulk delete matching passes.
     */
    @DeleteMapping("/by-party")
    public ResponseEntity<Map<String, Integer>> deleteByParty(
            @RequestParam String partyName,
            @RequestParam(required = false, defaultValue = "") String startDate,
            @RequestParam(required = false, defaultValue = "") String endDate) {
        int deleted = gatePassService.deleteByParty(partyName, startDate, endDate);
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    // ─── GLOBAL EXCEPTION HANDLER ─────────────────────────────────────────────

    @ExceptionHandler(java.util.NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(java.util.NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "An error occurred on the server"));
    }
}
