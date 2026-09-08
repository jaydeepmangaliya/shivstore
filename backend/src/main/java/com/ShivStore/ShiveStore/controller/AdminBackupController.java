package com.ShivStore.ShiveStore.controller;

import com.ShivStore.ShiveStore.service.DatabaseBackupService;
import com.ShivStore.ShiveStore.service.S3StorageService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/backup")
@CrossOrigin(origins = "*")
public class AdminBackupController {

    private final DatabaseBackupService databaseBackupService;
    private final S3StorageService s3StorageService;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public AdminBackupController(DatabaseBackupService databaseBackupService, 
                                 S3StorageService s3StorageService,
                                 MongoTemplate mongoTemplate) {
        this.databaseBackupService = databaseBackupService;
        this.s3StorageService = s3StorageService;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Manually triggers database backup and S3 upload, and returns the backup data as a downloadable Excel (.xlsx) file.
     * Optionally accepts startDate and endDate to filter export data.
     * Accessible by all authenticated users.
     * Endpoints: GET/POST /api/backup/trigger or /api/backup/manual
     */
    @RequestMapping(value = {"/trigger", "/manual"}, method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> triggerBackup(
            Authentication authentication,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate,
            @RequestParam(value = "partyName", required = false) String partyName) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Unauthorized - Authentication required");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        // 1. Perform S3 backup in the background/sync
        DatabaseBackupService.BackupResult s3BackupResult = databaseBackupService.performBackup();

        // 2. Generate and download Excel file
        try {
            byte[] excelBytes = generateDatabaseExcel(startDate, endDate, partyName);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
            String fileName = "shivstore_dump_" + timestamp + ".xlsx";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            // Optionally attach information about the S3 backup to a custom response header
            if (s3BackupResult.isSuccess()) {
                headers.add("X-S3-Backup-Status", "SUCCESS");
                headers.add("X-S3-Backup-Location", s3BackupResult.getS3Path());
            } else {
                headers.add("X-S3-Backup-Status", "FAILED");
            }

            return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to generate Excel backup: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    /**
     * Checks S3 backup configuration status.
     * Accessible by all authenticated users.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getBackupStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Unauthorized - Authentication required");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        Map<String, Object> status = new HashMap<>();
        status.put("s3Configured", s3StorageService.isS3Configured());
        status.put("s3Bucket", s3StorageService.getBucketName());
        status.put("scheduleCron", "0 0 0 * * ? (12:00 AM Midnight Daily)");
        return ResponseEntity.ok(status);
    }

    private byte[] generateDatabaseExcel(String startDateStr, String endDateStr, String partyNameFilter) throws Exception {
        java.time.LocalDate startLimit = parseFlexibleDate(startDateStr);
        java.time.LocalDate endLimit = parseFlexibleDate(endDateStr);

        try (Workbook workbook = new XSSFWorkbook()) {
            // 1. Create the formatted Party Statement sheet as the primary sheet
            createPartyStatementSheet(workbook, startLimit, endLimit, partyNameFilter);

            // 2. Create the distinct Parties summary sheet
            createPartiesSummarySheet(workbook, startLimit, endLimit);

            Set<String> collections = mongoTemplate.getCollectionNames();
            for (String colName : collections) {
                // Skip system collections and users collection from Excel dump
                if (colName.startsWith("system.") || "users".equalsIgnoreCase(colName)) {
                    continue;
                }

                Sheet sheet = workbook.createSheet(colName);
                List<Document> rawDocuments = mongoTemplate.findAll(Document.class, colName);

                // Filter documents by date if date range filter is provided
                List<Document> documents;
                if (startLimit != null || endLimit != null) {
                    documents = rawDocuments.stream().filter(doc -> {
                        Object dateObj = doc.get("date");
                        if (dateObj == null) dateObj = doc.get("createdAt");
                        if (dateObj == null) dateObj = doc.get("timestamp");
                        if (dateObj == null) dateObj = doc.get("created_at");

                        if (dateObj != null) {
                            java.time.LocalDate docDate = parseFlexibleDate(dateObj);
                            if (docDate != null) {
                                if (startLimit != null && docDate.isBefore(startLimit)) return false;
                                if (endLimit != null && docDate.isAfter(endLimit)) return false;
                            }
                        }
                        return true;
                    }).toList();
                } else {
                    documents = rawDocuments;
                }

                if (documents.isEmpty()) {
                    Row row = sheet.createRow(0);
                    row.createCell(0).setCellValue("No data found matching criteria in this collection");
                    continue;
                }

                // Gather headers
                Set<String> headers = new LinkedHashSet<>();
                headers.add("_id");
                for (Document doc : documents) {
                    headers.addAll(doc.keySet());
                }
                List<String> headerList = new ArrayList<>(headers);

                // Create header row
                Row headerRow = sheet.createRow(0);
                CellStyle headerStyle = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                headerStyle.setFont(font);

                // Apply simple background fill to header
                headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                for (int i = 0; i < headerList.size(); i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(headerList.get(i));
                    cell.setCellStyle(headerStyle);
                }

                // Populate data
                int rowIdx = 1;
                for (Document doc : documents) {
                    Row row = sheet.createRow(rowIdx++);
                    for (int colIdx = 0; colIdx < headerList.size(); colIdx++) {
                        String fieldName = headerList.get(colIdx);
                        Cell cell = row.createCell(colIdx);

                        // Redact passwords for users for security
                        if ("users".equalsIgnoreCase(colName) && "password".equalsIgnoreCase(fieldName)) {
                            cell.setCellValue("[REDACTED]");
                            continue;
                        }

                        Object val = doc.get(fieldName);
                        if (val != null) {
                            if (val instanceof Number) {
                                cell.setCellValue(((Number) val).doubleValue());
                            } else if (val instanceof Boolean) {
                                cell.setCellValue((Boolean) val);
                            } else {
                                cell.setCellValue(val.toString());
                            }
                        }
                    }
                }

                // Adjust column widths
                for (int i = 0; i < headerList.size(); i++) {
                    try {
                        sheet.autoSizeColumn(i);
                    } catch (Exception e) {
                        // fallback if auto-size fails in some headless environments
                    }
                }
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    private void createPartyStatementSheet(Workbook workbook, java.time.LocalDate startLimit, java.time.LocalDate endLimit, String partyNameFilter) {
        Sheet sheet = workbook.createSheet("party_statement");
        
        List<Document> rawPasses = mongoTemplate.findAll(Document.class, "gate_passes");
        
        List<Document> passes = rawPasses.stream().filter(doc -> {
            if (partyNameFilter != null && !partyNameFilter.isBlank()) {
                Object p = doc.get("partyName");
                if (p == null || !p.toString().trim().equalsIgnoreCase(partyNameFilter.trim())) {
                    return false;
                }
            }
            Object dateObj = doc.get("date");
            if (dateObj == null) dateObj = doc.get("createdAt");
            if (dateObj == null) dateObj = doc.get("timestamp");
            if (dateObj != null) {
                java.time.LocalDate docDate = parseFlexibleDate(dateObj);
                if (docDate != null) {
                    if (startLimit != null && docDate.isBefore(startLimit)) return false;
                    if (endLimit != null && docDate.isAfter(endLimit)) return false;
                }
            }
            return true;
        }).toList();

        if (passes.isEmpty()) {
            Row row = sheet.createRow(0);
            row.createCell(0).setCellValue("No gate pass records found for the selected period.");
            return;
        }

        // Group by partyName
        Map<String, List<Document>> partyMap = new LinkedHashMap<>();
        for (Document doc : passes) {
            String pName = doc.getString("partyName");
            if (pName == null || pName.isBlank()) {
                pName = "UNKNOWN / OTHERS";
            }
            partyMap.computeIfAbsent(pName, k -> new ArrayList<>()).add(doc);
        }

        List<String> materialsList = List.of("10 MM", "20 MM", "6 MM", "40 MM", "65 MM", "POWDER", "GSB", "DUST", "STONE CHIPS", "OTHERS");

        // Cell Styles
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);

        Font boldFont = workbook.createFont();
        boldFont.setBold(true);

        CellStyle companyHeaderStyle = workbook.createCellStyle();
        companyHeaderStyle.setFont(titleFont);
        companyHeaderStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle contactHeaderStyle = workbook.createCellStyle();
        contactHeaderStyle.setFont(boldFont);
        contactHeaderStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle purchaserStyle = workbook.createCellStyle();
        purchaserStyle.setFont(boldFont);

        CellStyle tableHeaderStyle = workbook.createCellStyle();
        tableHeaderStyle.setFont(boldFont);
        tableHeaderStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        tableHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        tableHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
        tableHeaderStyle.setBorderTop(BorderStyle.THIN);
        tableHeaderStyle.setBorderBottom(BorderStyle.THIN);
        tableHeaderStyle.setBorderLeft(BorderStyle.THIN);
        tableHeaderStyle.setBorderRight(BorderStyle.THIN);

        CellStyle dataStyle = workbook.createCellStyle();
        dataStyle.setBorderTop(BorderStyle.THIN);
        dataStyle.setBorderBottom(BorderStyle.THIN);
        dataStyle.setBorderLeft(BorderStyle.THIN);
        dataStyle.setBorderRight(BorderStyle.THIN);

        CellStyle centerDataStyle = workbook.createCellStyle();
        centerDataStyle.setBorderTop(BorderStyle.THIN);
        centerDataStyle.setBorderBottom(BorderStyle.THIN);
        centerDataStyle.setBorderLeft(BorderStyle.THIN);
        centerDataStyle.setBorderRight(BorderStyle.THIN);
        centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle totalRowStyle = workbook.createCellStyle();
        totalRowStyle.setFont(boldFont);
        totalRowStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalRowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalRowStyle.setBorderTop(BorderStyle.THIN);
        totalRowStyle.setBorderBottom(BorderStyle.THIN);
        totalRowStyle.setBorderLeft(BorderStyle.THIN);
        totalRowStyle.setBorderRight(BorderStyle.THIN);

        int currentRow = 0;
        int totalCols = 4 + materialsList.size() + 2;

        for (Map.Entry<String, List<Document>> entry : partyMap.entrySet()) {
            String partyName = entry.getKey();
            List<Document> partyPasses = entry.getValue();

            // Header Row 1: Company Title (Merged across all columns)
            Row rTitle = sheet.createRow(currentRow++);
            Cell cTitle = rTitle.createCell(0);
            cTitle.setCellValue("SHIV STONE CRUSHER MOTA GUNDA");
            cTitle.setCellStyle(companyHeaderStyle);
            sheet.addMergedRegion(new CellRangeAddress(rTitle.getRowNum(), rTitle.getRowNum(), 0, totalCols - 1));

            // Header Row 2: Mobile Numbers (Merged across all columns)
            Row rContact = sheet.createRow(currentRow++);
            Cell cContact = rContact.createCell(0);
            cContact.setCellValue("MOBILE NUMBER :- 9712944133           MOBILE NUMBER :- 9979844133");
            cContact.setCellStyle(contactHeaderStyle);
            sheet.addMergedRegion(new CellRangeAddress(rContact.getRowNum(), rContact.getRowNum(), 0, totalCols - 1));

            // Header Row 3: Purchaser Name (Merged across all columns)
            Row rPurchaser = sheet.createRow(currentRow++);
            Cell cPurchaser = rPurchaser.createCell(0);
            cPurchaser.setCellValue("PURCHASER :- " + partyName.toUpperCase());
            cPurchaser.setCellStyle(purchaserStyle);
            sheet.addMergedRegion(new CellRangeAddress(rPurchaser.getRowNum(), rPurchaser.getRowNum(), 0, totalCols - 1));

            // Header Row 4: Table Headers
            Row rHeader = sheet.createRow(currentRow++);
            String[] baseHeaders = new String[]{"SIR NO", "DATE", "VEHICLE NO", "ROYALTY NO"};
            for (int i = 0; i < baseHeaders.length; i++) {
                Cell cell = rHeader.createCell(i);
                cell.setCellValue(baseHeaders[i]);
                cell.setCellStyle(tableHeaderStyle);
            }
            for (int i = 0; i < materialsList.size(); i++) {
                Cell cell = rHeader.createCell(4 + i);
                cell.setCellValue(materialsList.get(i));
                cell.setCellStyle(tableHeaderStyle);
            }
            Cell cNetWt = rHeader.createCell(4 + materialsList.size());
            cNetWt.setCellValue("NET WEIGHT (KG)");
            cNetWt.setCellStyle(tableHeaderStyle);

            Cell cNetTons = rHeader.createCell(5 + materialsList.size());
            cNetTons.setCellValue("NET TONS");
            cNetTons.setCellStyle(tableHeaderStyle);

            // Data Rows
            double[] materialTotals = new double[materialsList.size()];
            double grandNetWeightKg = 0.0;
            double grandNetTons = 0.0;
            int sirNo = 1;

            for (Document passDoc : partyPasses) {
                Row rData = sheet.createRow(currentRow++);
                
                // SIR NO
                Cell cellSir = rData.createCell(0);
                cellSir.setCellValue(sirNo++);
                cellSir.setCellStyle(centerDataStyle);

                // DATE
                Cell cellDate = rData.createCell(1);
                Object d = passDoc.get("date");
                cellDate.setCellValue(d != null ? d.toString() : "");
                cellDate.setCellStyle(centerDataStyle);

                // VEHICLE NO
                Cell cellVeh = rData.createCell(2);
                Object v = passDoc.get("vehicleNumber");
                cellVeh.setCellValue(v != null ? v.toString() : "");
                cellVeh.setCellStyle(centerDataStyle);

                // ROYALTY NO
                Cell cellRoyalty = rData.createCell(3);
                Object passNoObj = passDoc.get("passNo");
                cellRoyalty.setCellValue(passNoObj != null ? "#" + passNoObj.toString() : "");
                cellRoyalty.setCellStyle(centerDataStyle);

                // Material Matching
                String passMat = passDoc.getString("materials");
                String passMatNorm = passMat != null ? passMat.trim().toUpperCase() : "";

                Double netWeightVal = passDoc.getDouble("netWeight");
                if (netWeightVal == null && passDoc.get("netWeight") instanceof Number num) {
                    netWeightVal = num.doubleValue();
                }
                double netWeight = netWeightVal != null ? netWeightVal : 0.0;

                Double netTonsVal = passDoc.getDouble("netTons");
                if (netTonsVal == null && passDoc.get("netTons") instanceof Number num) {
                    netTonsVal = num.doubleValue();
                }
                double netTons = netTonsVal != null ? netTonsVal : 0.0;

                for (int m = 0; m < materialsList.size(); m++) {
                    Cell cellMat = rData.createCell(4 + m);
                    cellMat.setCellStyle(dataStyle);

                    String targetMat = materialsList.get(m);
                    boolean isMatch = passMatNorm.equalsIgnoreCase(targetMat) || 
                                     ("OTHERS".equals(targetMat) && materialsList.stream().noneMatch(passMatNorm::equalsIgnoreCase));

                    if (isMatch) {
                        cellMat.setCellValue(netWeight);
                        materialTotals[m] += netWeight;
                    } else {
                        cellMat.setCellValue("");
                    }
                }

                // NET WEIGHT & NET TONS
                Cell cellNetWeight = rData.createCell(4 + materialsList.size());
                cellNetWeight.setCellValue(netWeight);
                cellNetWeight.setCellStyle(dataStyle);
                grandNetWeightKg += netWeight;

                Cell cellNetTons = rData.createCell(5 + materialsList.size());
                cellNetTons.setCellValue(netTons);
                cellNetTons.setCellStyle(dataStyle);
                grandNetTons += netTons;
            }

            // Total Summary Row (Merged label across columns 0 to 3)
            Row rTotal = sheet.createRow(currentRow++);
            Cell cTotLabel = rTotal.createCell(0);
            cTotLabel.setCellValue("TOTAL TON / WEIGHT :-");
            cTotLabel.setCellStyle(totalRowStyle);

            for (int i = 1; i < 4; i++) {
                Cell cellEmpty = rTotal.createCell(i);
                cellEmpty.setCellStyle(totalRowStyle);
            }
            sheet.addMergedRegion(new CellRangeAddress(rTotal.getRowNum(), rTotal.getRowNum(), 0, 3));

            for (int m = 0; m < materialsList.size(); m++) {
                Cell cellMatTot = rTotal.createCell(4 + m);
                cellMatTot.setCellValue(materialTotals[m] > 0 ? materialTotals[m] : 0.0);
                cellMatTot.setCellStyle(totalRowStyle);
            }

            Cell cTotNetWeight = rTotal.createCell(4 + materialsList.size());
            cTotNetWeight.setCellValue(grandNetWeightKg);
            cTotNetWeight.setCellStyle(totalRowStyle);

            Cell cTotNetTons = rTotal.createCell(5 + materialsList.size());
            cTotNetTons.setCellValue(grandNetTons);
            cTotNetTons.setCellStyle(totalRowStyle);

            // Add 2 spacing blank rows before next party
            currentRow += 2;
        }

        // Auto-size columns with balanced width bounds
        for (int col = 0; col < totalCols; col++) {
            try {
                sheet.autoSizeColumn(col);
                int autoWidth = sheet.getColumnWidth(col);
                if (col == 0) { // SIR NO column: compact width (~8-10 chars)
                    sheet.setColumnWidth(col, Math.min(autoWidth + 256, 9 * 256));
                } else if (col <= 3) { // Date, Vehicle, Royalty columns (~14 chars)
                    sheet.setColumnWidth(col, Math.max(autoWidth + 512, 14 * 256));
                } else { // Material & Net weight columns (~11 chars)
                    sheet.setColumnWidth(col, Math.max(autoWidth + 256, 11 * 256));
                }
            } catch (Exception ignored) {}
        }
    }

    private void createPartiesSummarySheet(Workbook workbook, java.time.LocalDate startLimit, java.time.LocalDate endLimit) {
        Sheet sheet = workbook.createSheet("parties");

        List<Document> rawPasses = mongoTemplate.findAll(Document.class, "gate_passes");

        List<Document> passes = rawPasses.stream().filter(doc -> {
            Object dateObj = doc.get("date");
            if (dateObj == null) dateObj = doc.get("createdAt");
            if (dateObj == null) dateObj = doc.get("timestamp");
            if (dateObj != null) {
                java.time.LocalDate docDate = parseFlexibleDate(dateObj);
                if (docDate != null) {
                    if (startLimit != null && docDate.isBefore(startLimit)) return false;
                    if (endLimit != null && docDate.isAfter(endLimit)) return false;
                }
            }
            return true;
        }).toList();

        if (passes.isEmpty()) {
            Row row = sheet.createRow(0);
            row.createCell(0).setCellValue("No party dispatches found for the selected period.");
            return;
        }

        // Group dispatches by partyName
        Map<String, List<Document>> partyMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Document doc : passes) {
            String pName = doc.getString("partyName");
            if (pName == null || pName.isBlank()) {
                pName = "UNKNOWN / OTHERS";
            }
            partyMap.computeIfAbsent(pName.trim(), k -> new ArrayList<>()).add(doc);
        }

        // Styles
        Font boldFont = workbook.createFont();
        boldFont.setBold(true);

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(boldFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        CellStyle dataStyle = workbook.createCellStyle();
        dataStyle.setBorderTop(BorderStyle.THIN);
        dataStyle.setBorderBottom(BorderStyle.THIN);
        dataStyle.setBorderLeft(BorderStyle.THIN);
        dataStyle.setBorderRight(BorderStyle.THIN);

        CellStyle totalStyle = workbook.createCellStyle();
        totalStyle.setFont(boldFont);
        totalStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalStyle.setBorderTop(BorderStyle.THIN);
        totalStyle.setBorderBottom(BorderStyle.THIN);
        totalStyle.setBorderLeft(BorderStyle.THIN);
        totalStyle.setBorderRight(BorderStyle.THIN);

        // Header Row
        String[] headers = new String[]{
            "SIR NO", "PARTY NAME", "TOTAL DISPATCHES", "TOTAL NET WEIGHT (KG)", "TOTAL TONS", "FIRST DISPATCH DATE", "LAST DISPATCH DATE"
        };
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        int sirNo = 1;
        int grandDispatches = 0;
        double grandWeightKg = 0.0;
        double grandTons = 0.0;

        for (Map.Entry<String, List<Document>> entry : partyMap.entrySet()) {
            String partyName = entry.getKey();
            List<Document> partyPasses = entry.getValue();

            int dispatchCount = partyPasses.size();
            double partyWeightKg = 0.0;
            double partyTons = 0.0;
            String firstDate = "";
            String lastDate = "";

            for (Document pass : partyPasses) {
                Double nw = pass.getDouble("netWeight");
                if (nw == null && pass.get("netWeight") instanceof Number num) nw = num.doubleValue();
                if (nw != null) partyWeightKg += nw;

                Double nt = pass.getDouble("netTons");
                if (nt == null && pass.get("netTons") instanceof Number num) nt = num.doubleValue();
                if (nt != null) partyTons += nt;

                Object d = pass.get("date");
                if (d != null && !d.toString().isBlank()) {
                    String dStr = d.toString().trim();
                    if (firstDate.isEmpty()) firstDate = dStr;
                    lastDate = dStr;
                }
            }

            Row row = sheet.createRow(rowIdx++);

            Cell cSir = row.createCell(0);
            cSir.setCellValue(sirNo++);
            cSir.setCellStyle(dataStyle);

            Cell cParty = row.createCell(1);
            cParty.setCellValue(partyName);
            cParty.setCellStyle(dataStyle);

            Cell cDisp = row.createCell(2);
            cDisp.setCellValue(dispatchCount);
            cDisp.setCellStyle(dataStyle);

            Cell cWt = row.createCell(3);
            cWt.setCellValue(partyWeightKg);
            cWt.setCellStyle(dataStyle);

            Cell cTons = row.createCell(4);
            cTons.setCellValue(partyTons);
            cTons.setCellStyle(dataStyle);

            Cell cFirst = row.createCell(5);
            cFirst.setCellValue(firstDate);
            cFirst.setCellStyle(dataStyle);

            Cell cLast = row.createCell(6);
            cLast.setCellValue(lastDate);
            cLast.setCellStyle(dataStyle);

            grandDispatches += dispatchCount;
            grandWeightKg += partyWeightKg;
            grandTons += partyTons;
        }

        // Summary Row
        Row totalRow = sheet.createRow(rowIdx);

        Cell cTotLabel = totalRow.createCell(0);
        cTotLabel.setCellValue("TOTAL");
        cTotLabel.setCellStyle(totalStyle);

        Cell cTotParty = totalRow.createCell(1);
        cTotParty.setCellValue(partyMap.size() + " Unique Parties");
        cTotParty.setCellStyle(totalStyle);

        Cell cTotDisp = totalRow.createCell(2);
        cTotDisp.setCellValue(grandDispatches);
        cTotDisp.setCellStyle(totalStyle);

        Cell cTotWt = totalRow.createCell(3);
        cTotWt.setCellValue(grandWeightKg);
        cTotWt.setCellStyle(totalStyle);

        Cell cTotTons = totalRow.createCell(4);
        cTotTons.setCellValue(grandTons);
        cTotTons.setCellStyle(totalStyle);

        Cell cEmpty1 = totalRow.createCell(5);
        cEmpty1.setCellStyle(totalStyle);

        Cell cEmpty2 = totalRow.createCell(6);
        cEmpty2.setCellStyle(totalStyle);

        for (int i = 0; i < headers.length; i++) {
            try {
                sheet.autoSizeColumn(i);
            } catch (Exception ignored) {}
        }
    }

    private java.time.LocalDate parseFlexibleDate(Object val) {
        if (val == null) return null;
        if (val instanceof java.util.Date dateVal) {
            return dateVal.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        }
        String s = val.toString().trim();
        if (s.isBlank()) return null;
        try {
            if (s.contains("/")) {
                String[] parts = s.split("/");
                if (parts.length == 3) {
                    return java.time.LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            } else if (s.contains("-")) {
                String[] parts = s.split("-");
                if (parts.length >= 3) {
                    if (parts[0].length() == 4) {
                        return java.time.LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2].substring(0, Math.min(2, parts[2].length()))));
                    } else {
                        return java.time.LocalDate.of(Integer.parseInt(parts[2].substring(0, Math.min(4, parts[2].length()))), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
