package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.repository.GatePassRepository;
import com.ShivStore.ShiveStore.model.DailyRevenue;
import com.ShivStore.ShiveStore.model.MonthlyOrder;
import com.ShivStore.ShiveStore.repository.DailyRevenueRepository;
import com.ShivStore.ShiveStore.repository.MonthlyOrderRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Month;
import java.time.YearMonth;
import java.time.LocalDate;
import java.util.*;

/**
 * DashboardController — provides aggregated stats for the dashboard.
 * Ton Overview and Orders now pull from real GatePass data.
 */
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DailyRevenueRepository dailyRevenueRepository;
    private final MonthlyOrderRepository monthlyOrderRepository;
    private final GatePassRepository gatePassRepository;

    public DashboardController(DailyRevenueRepository dailyRevenueRepository,
                               MonthlyOrderRepository monthlyOrderRepository,
                               GatePassRepository gatePassRepository) {
        this.dailyRevenueRepository = dailyRevenueRepository;
        this.monthlyOrderRepository = monthlyOrderRepository;
        this.gatePassRepository = gatePassRepository;
    }

    // ─── Revenue Chart ────────────────────────────────────────────────────────

    @GetMapping("/revenue")
    public List<Map<String, Object>> getRevenue(
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "startDate", required = false) String startDateStr,
            @RequestParam(value = "endDate", required = false) String endDateStr) {

        LocalDate start = parseDate(startDateStr);
        LocalDate end = parseDate(endDateStr);

        if (start != null && end != null && !start.isAfter(end)) {
            List<Map<String, Object>> result = new ArrayList<>();
            LocalDate curr = start;
            while (!curr.isAfter(end)) {
                int day = curr.getDayOfMonth();
                int monthInt = curr.getMonthValue();
                int yearInt = curr.getYear();
                int prevYear = yearInt - 1;

                String dateStrCurrent  = String.format("%02d/%02d/%04d", day, monthInt, yearInt);
                String dateStrPrevious = String.format("%02d/%02d/%04d", day, monthInt, prevYear);

                double currentTons  = Optional.ofNullable(gatePassRepository.sumNetTonsByDayMonthAndYear(day, monthInt, yearInt, dateStrCurrent)).orElse(0.0);
                double previousTons = Optional.ofNullable(gatePassRepository.sumNetTonsByDayMonthAndYear(day, monthInt, prevYear, dateStrPrevious)).orElse(0.0);

                String dayLabel = (day < 10) ? "0" + day : String.valueOf(day);
                Map<String, Object> dayMap = new HashMap<>();
                dayMap.put("label", dayLabel);
                dayMap.put("date", dateStrCurrent);
                dayMap.put("dayName", curr.getDayOfWeek().name().substring(0, 3));
                dayMap.put("val1", Math.round(currentTons * 100.0) / 100.0);
                dayMap.put("val2", Math.round(previousTons * 100.0) / 100.0);
                result.add(dayMap);

                curr = curr.plusDays(1);
            }
            return result;
        }

        LocalDate now = LocalDate.now();
        int targetYear = (year != null) ? year : now.getYear();
        String targetMonth = (month != null) ? month : now.getMonth().name().substring(0, 3).toLowerCase();

        Month monthEnum = Month.JANUARY;
        for (Month m : Month.values()) {
            if (m.name().toLowerCase().startsWith(targetMonth.toLowerCase())) {
                monthEnum = m;
                break;
            }
        }

        YearMonth yearMonth  = YearMonth.of(targetYear, monthEnum);
        int daysInMonth      = yearMonth.lengthOfMonth();
        int monthInt         = monthEnum.getValue();
        int previousYear     = targetYear - 1;

        String queryMonthName = targetMonth.substring(0, 1).toUpperCase() + targetMonth.substring(1).toLowerCase();
        List<DailyRevenue> dbRecords = dailyRevenueRepository.findByMonthNameAndYear(queryMonthName, targetYear);

        Map<String, DailyRevenue> dbMap = new HashMap<>();
        if (dbRecords != null) {
            for (DailyRevenue rec : dbRecords) {
                dbMap.put(rec.getDay(), rec);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 1; i <= daysInMonth; i++) {
            String dayLabel = (i < 10) ? "0" + i : String.valueOf(i);
            String dateStrCurrent  = String.format("%02d/%02d/%04d", i, monthInt, targetYear);
            String dateStrPrevious = String.format("%02d/%02d/%04d", i, monthInt, previousYear);

            double currentTons  = Optional.ofNullable(gatePassRepository.sumNetTonsByDayMonthAndYear(i, monthInt, targetYear, dateStrCurrent)).orElse(0.0);
            double previousTons = Optional.ofNullable(gatePassRepository.sumNetTonsByDayMonthAndYear(i, monthInt, previousYear, dateStrPrevious)).orElse(0.0);

            if (dbMap.containsKey(dayLabel)) {
                DailyRevenue dbRec = dbMap.get(dayLabel);
                if (dbRec.getThisWeekRevenue() != null) currentTons += dbRec.getThisWeekRevenue();
                if (dbRec.getLastWeekRevenue() != null) previousTons += dbRec.getLastWeekRevenue();
            }

            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("label", dayLabel);
            dayMap.put("date", dateStrCurrent);
            dayMap.put("val1", Math.round(currentTons * 100.0) / 100.0);
            dayMap.put("val2", Math.round(previousTons * 100.0) / 100.0);
            result.add(dayMap);
        }
        return result;
    }

    private LocalDate parseDate(String dStr) {
        if (dStr == null || dStr.isBlank()) return null;
        try {
            if (dStr.contains("-")) {
                return LocalDate.parse(dStr);
            } else if (dStr.contains("/")) {
                String[] parts = dStr.split("/");
                return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }

    // ─── Ton Overview (Orders) — now from real GatePass data ─────────────────

    /**
     * GET /api/dashboard/orders?year=2026
     * Returns 12 months of gate pass counts (current year vs previous year)
     * and total net tons per month — pulled directly from the gate_pass table.
     */
    @GetMapping("/orders")
    public List<Map<String, Object>> getOrders(
            @RequestParam(value = "year", required = false) Integer year) {

        LocalDate now = LocalDate.now();
        int targetYear    = (year != null) ? year : now.getYear();
        int previousYear  = targetYear - 1;

        String[] monthLabels = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        List<Map<String, Object>> result = new ArrayList<>();

        for (int m = 1; m <= 12; m++) {
            long currentCount  = gatePassRepository.countByMonthAndYear(m, targetYear);
            long previousCount = gatePassRepository.countByMonthAndYear(m, previousYear);
            double currentTons = Optional.ofNullable(
                    gatePassRepository.sumNetTonsByMonthAndYear(m, targetYear)).orElse(0.0);

            Map<String, Object> monthMap = new HashMap<>();
            monthMap.put("label",    monthLabels[m - 1]);
            monthMap.put("current",  currentCount);
            monthMap.put("previous", previousCount);
            monthMap.put("tons",     Math.round(currentTons * 100.0) / 100.0);
            result.add(monthMap);
        }

        return result;
    }

    // ─── Summary Stats for Dashboard Cards ───────────────────────────────────

    /**
     * GET /api/dashboard/stats
     * Returns total pass count and total tons for the current year.
     */
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        LocalDate now = LocalDate.now();
        int year = now.getYear();

        long totalPasses = gatePassRepository.countByYear(year);

        // Sum tons across all 12 months
        double totalTons = 0.0;
        for (int m = 1; m <= 12; m++) {
            totalTons += Optional.ofNullable(
                    gatePassRepository.sumNetTonsByMonthAndYear(m, year)).orElse(0.0);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("year",         year);
        stats.put("totalPasses",  totalPasses);
        stats.put("totalTons",    Math.round(totalTons * 100.0) / 100.0);
        return stats;
    }
}
