package com.ShivStore.ShiveStore.service;

import com.ShivStore.ShiveStore.dto.GatePassRequestDTO;
import com.ShivStore.ShiveStore.dto.GatePassResponseDTO;
import com.ShivStore.ShiveStore.model.GatePass;
import com.ShivStore.ShiveStore.repository.GatePassRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * GatePassServiceImpl — Single Responsibility: all gate pass business logic lives here.
 */
@Service
public class GatePassServiceImpl implements GatePassService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final GatePassRepository repository;
    private final GatePassNumberStrategy passNumberStrategy;

    /** Constructor injection (preferred over @Autowired field injection) */
    public GatePassServiceImpl(GatePassRepository repository,
            GatePassNumberStrategy passNumberStrategy) {
        this.repository = repository;
        this.passNumberStrategy = passNumberStrategy;
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    @Override
    public GatePassResponseDTO create(GatePassRequestDTO request) {
        validateWeights(request.getLoadWeight(), request.getEmptyWeight());

        double netWeight = request.getLoadWeight() - request.getEmptyWeight();
        double netTons = Math.round(netWeight / 1000.0 * 100.0) / 100.0;

        String date = (request.getDate() != null && !request.getDate().isBlank())
                ? request.getDate()
                : LocalDate.now().format(DATE_FORMATTER);

        String signature = (request.getGatePassSignature() != null && !request.getGatePassSignature().isBlank())
                ? request.getGatePassSignature()
                : "Shiv Stone (Auth)";

        // Strategy Pattern: delegate passNo assignment
        int passNo = passNumberStrategy.nextPassNo();

        GatePass entity = GatePass.builder()
                .passNo(passNo)
                .date(date)
                .partyName(request.getPartyName().trim())
                .vehicleNumber(request.getVehicleNumber().trim().toUpperCase())
                .materials(request.getMaterials())
                .time(request.getTime())
                .timePeriod(request.getTimePeriod())
                .loadWeight(request.getLoadWeight())
                .emptyWeight(request.getEmptyWeight())
                .netWeight(netWeight)
                .netTons(netTons)
                .villageName(request.getVillageName() != null ? request.getVillageName().trim() : null)
                .gatePassSignature(signature)
                .createdAt(LocalDateTime.now())
                .build();

        return GatePassResponseDTO.from(repository.save(entity));
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    @Override
    public GatePassResponseDTO update(String id, GatePassRequestDTO request) {
        GatePass existing = repository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Gate pass not found: id=" + id));

        validateWeights(request.getLoadWeight(), request.getEmptyWeight());

        double netWeight = request.getLoadWeight() - request.getEmptyWeight();
        double netTons = Math.round(netWeight / 1000.0 * 100.0) / 100.0;

        String date = (request.getDate() != null && !request.getDate().isBlank())
                ? request.getDate()
                : existing.getDate();

        String signature = (request.getGatePassSignature() != null && !request.getGatePassSignature().isBlank())
                ? request.getGatePassSignature()
                : existing.getGatePassSignature();

        // Preserve immutable fields: id, passNo, createdAt
        existing.setDate(date);
        existing.setPartyName(request.getPartyName().trim());
        existing.setVehicleNumber(request.getVehicleNumber().trim().toUpperCase());
        existing.setMaterials(request.getMaterials());
        existing.setTime(request.getTime());
        existing.setTimePeriod(request.getTimePeriod());
        existing.setLoadWeight(request.getLoadWeight());
        existing.setEmptyWeight(request.getEmptyWeight());
        existing.setNetWeight(netWeight);
        existing.setNetTons(netTons);
        existing.setVillageName(request.getVillageName() != null ? request.getVillageName().trim() : null);
        existing.setGatePassSignature(signature);

        return GatePassResponseDTO.from(repository.save(existing));
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    @Override
    public List<GatePassResponseDTO> findAll() {
        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(GatePassResponseDTO::from)
                .toList();
    }

    @Override
    public GatePassResponseDTO findById(String id) {
        return repository.findById(id)
                .map(GatePassResponseDTO::from)
                .orElseThrow(() -> new NoSuchElementException("Gate pass not found: id=" + id));
    }

    @Override
    public List<GatePassResponseDTO> search(String q, String date) {
        String safeQ = (q != null) ? q.trim() : "";
        String safeDate = (date != null) ? date.trim() : "";
        return repository.search(safeQ, safeDate)
                .stream()
                .map(GatePassResponseDTO::from)
                .toList();
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    @Override
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new NoSuchElementException("Gate pass not found: id=" + id);
        }
        repository.deleteById(id);
    }

    @Override
    public int getNextPassNo() {
        return passNumberStrategy.nextPassNo();
    }

    // ─── BULK DELETE ──────────────────────────────────────────────────────────

    @Override
    public long countByParty(String partyName, String startDate, String endDate) {
        List<GatePass> passes = getMatchingPasses(partyName, startDate, endDate);
        return passes.size();
    }

    @Override
    public int deleteByParty(String partyName, String startDate, String endDate) {
        List<GatePass> passes = getMatchingPasses(partyName, startDate, endDate);
        if (passes.isEmpty()) return 0;
        int count = passes.size();
        repository.deleteAll(passes);
        return count;
    }

    private List<GatePass> getMatchingPasses(String partyName, String startDate, String endDate) {
        if (partyName == null || partyName.isBlank()) {
            throw new IllegalArgumentException("Party name is required");
        }
        List<GatePass> passes = repository.findByPartyNameIgnoreCase(partyName.trim());
        LocalDate start = parseFlexibleDate(startDate);
        LocalDate end = parseFlexibleDate(endDate);

        if (start == null && end == null) {
            return passes;
        }

        return passes.stream().filter(p -> {
            LocalDate passDate = parseFlexibleDate(p.getDate());
            if (passDate == null) return true;
            if (start != null && passDate.isBefore(start)) return false;
            if (end != null && passDate.isAfter(end)) return false;
            return true;
        }).toList();
    }

    private LocalDate parseFlexibleDate(String dStr) {
        if (dStr == null || dStr.isBlank()) return null;
        String s = dStr.trim();
        try {
            if (s.contains("/")) {
                String[] parts = s.split("/");
                if (parts.length == 3) {
                    return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            } else if (s.contains("-")) {
                String[] parts = s.split("-");
                if (parts.length == 3) {
                    if (parts[0].length() == 4) {
                        return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                    } else {
                        return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

    private void validateWeights(Double load, Double empty) {
        if (load == null || empty == null) {
            throw new IllegalArgumentException("Load and empty weight must not be null");
        }
        if (load <= empty) {
            throw new IllegalArgumentException("Load weight (" + load + ") must exceed empty weight (" + empty + ")");
        }
    }
}
