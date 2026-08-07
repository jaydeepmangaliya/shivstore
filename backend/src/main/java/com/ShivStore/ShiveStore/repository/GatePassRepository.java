package com.ShivStore.ShiveStore.repository;

import com.ShivStore.ShiveStore.model.GatePass;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Repository Pattern — abstracts all data-access for GatePass using Spring Data MongoDB.
 */
@Repository
public interface GatePassRepository extends MongoRepository<GatePass, String> {

    /** All passes newest first — used by Users page list. */
    List<GatePass> findAllByOrderByCreatedAtDesc();

    /** Look up by human-readable pass number. */
    Optional<GatePass> findByPassNo(Integer passNo);

    /** Highest passNo record to calculate next sequence number. */
    Optional<GatePass> findFirstByOrderByPassNoDesc();

    /** Full-text search across party name and vehicle number. */
    List<GatePass> findByPartyNameContainingIgnoreCaseOrVehicleNumberContainingIgnoreCaseOrderByCreatedAtDesc(
            String partyName, String vehicleNumber);

    /** Filter by display date string (DD/MM/YYYY). */
    List<GatePass> findByDateOrderByCreatedAtDesc(String date);

    /** Find gate passes within a timestamp range. */
    List<GatePass> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Count gate passes within a timestamp range. */
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /** Find all gate passes by date string. */
    List<GatePass> findByDate(String date);

    /** Find all gate passes by party name (case-insensitive). */
    List<GatePass> findByPartyNameIgnoreCase(String partyName);

    /**
     * Get the current maximum passNo to calculate the next sequential number.
     */
    default Integer findMaxPassNo() {
        return findFirstByOrderByPassNoDesc()
                .map(GatePass::getPassNo)
                .orElse(1000);
    }

    /** Combined search + date filter. */
    default List<GatePass> search(String q, String date) {
        boolean hasQ = q != null && !q.isBlank();
        boolean hasDate = date != null && !date.isBlank();

        if (!hasQ && !hasDate) {
            return findAllByOrderByCreatedAtDesc();
        } else if (hasQ && !hasDate) {
            return findByPartyNameContainingIgnoreCaseOrVehicleNumberContainingIgnoreCaseOrderByCreatedAtDesc(q.trim(), q.trim());
        } else if (!hasQ && hasDate) {
            return findByDateOrderByCreatedAtDesc(date.trim());
        } else {
            String targetQ = q.trim().toLowerCase();
            String targetDate = date.trim();
            return findAllByOrderByCreatedAtDesc().stream()
                    .filter(g -> (g.getPartyName() != null && g.getPartyName().toLowerCase().contains(targetQ)) ||
                                 (g.getVehicleNumber() != null && g.getVehicleNumber().toLowerCase().contains(targetQ)))
                    .filter(g -> targetDate.equalsIgnoreCase(g.getDate()))
                    .toList();
        }
    }

    /** Count passes in a specific month + year for dashboard stats. */
    default long countByMonthAndYear(int month, int year) {
        LocalDateTime start = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime end = start.plusMonths(1);
        return countByCreatedAtBetween(start, end);
    }

    /** Count all gate passes in a year for dashboard Ton Overview. */
    default long countByYear(int year) {
        LocalDateTime start = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime end = start.plusYears(1);
        return countByCreatedAtBetween(start, end);
    }

    /** Sum net tons per month for a given year (Ton Overview dashboard). */
    default Double sumNetTonsByMonthAndYear(int month, int year) {
        LocalDateTime start = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime end = start.plusMonths(1);
        List<GatePass> passes = findByCreatedAtBetween(start, end);
        return passes.stream()
                .mapToDouble(p -> p.getNetTons() != null ? p.getNetTons() : 0.0)
                .sum();
    }

    /** Sum net tons for a specific day, month, and year. */
    default Double sumNetTonsByDayMonthAndYear(int day, int month, int year, String dateStr) {
        LocalDateTime start = LocalDateTime.of(year, month, day, 0, 0);
        LocalDateTime end = start.plusDays(1);
        List<GatePass> passesByTime = findByCreatedAtBetween(start, end);
        List<GatePass> passesByDateStr = findByDate(dateStr);

        Set<String> seenIds = new HashSet<>();
        double total = 0.0;
        for (GatePass p : passesByTime) {
            if (p.getId() != null && seenIds.add(p.getId())) {
                total += (p.getNetTons() != null ? p.getNetTons() : 0.0);
            }
        }
        for (GatePass p : passesByDateStr) {
            if (p.getId() != null && seenIds.add(p.getId())) {
                total += (p.getNetTons() != null ? p.getNetTons() : 0.0);
            }
        }
        return total;
    }
}
