package com.miguex.dashboard.service;

import com.miguex.dashboard.model.WadChat;
import com.miguex.dashboard.repo.WadChatRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;

/**
 * Lee el Excel de WhatsApp WAD (hoja "Detalle1") y persiste los chats en MySQL.
 * Replica la lógica de parseo del HTML original:
 *  - fecha de "Fecha real"
 *  - matriculado = ("Matriculado real" == "Matriculado")
 *  - agente = parte luego de " - " del campo "Usuario"
 */
@Service
public class WadImportService {

    private final WadChatRepository repo;

    public WadImportService(WadChatRepository repo) {
        this.repo = repo;
    }

    public record ImportResult(int chats, int cerrados, int matriculados) {}

    @Transactional
    public ImportResult importExcel(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            Sheet ws = wb.getSheet("Detalle1");
            if (ws == null) ws = wb.getSheetAt(0);
            if (ws == null) throw new IllegalArgumentException("El archivo no tiene la hoja 'Detalle1'.");

            Row header = ws.getRow(ws.getFirstRowNum());
            if (header == null) throw new IllegalArgumentException("La hoja 'Detalle1' no tiene encabezados.");
            Map<String, Integer> cols = mapColumns(header);

            int cFecha = col(cols, "fecha real");
            int cDia   = col(cols, "dia");
            int cHora  = col(cols, "hora real");
            int cEstado = col(cols, "estado chat");
            int cRes   = col(cols, "resoluciones real");
            int cMat   = col(cols, "matriculado real");
            int cRep   = cols.getOrDefault("repetidos", -1); // opcional
            int cUser  = col(cols, "usuario");

            repo.deleteAllInBatch();

            List<WadChat> batch = new ArrayList<>();
            int cerrados = 0, matriculados = 0;

            for (int i = ws.getFirstRowNum() + 1; i <= ws.getLastRowNum(); i++) {
                Row row = ws.getRow(i);
                if (row == null) continue;

                LocalDate fecha = dateFrom(cell(row, cFecha));
                if (fecha == null) continue;

                String dia = strVal(cell(row, cDia)).trim();
                Integer hora = intVal(cell(row, cHora));
                String estado = strVal(cell(row, cEstado)).trim();
                String res = strVal(cell(row, cRes)).trim();
                boolean mat = "Matriculado".equals(strVal(cell(row, cMat)).trim());
                boolean rep = "Duplicado".equals(strVal(cell(row, cRep)).trim());
                String agent = parseAgent(strVal(cell(row, cUser)));

                WadChat w = new WadChat();
                w.setFecha(fecha);
                w.setDia(dia);
                w.setHora(hora);
                w.setEstadoChat(estado);
                w.setResoluciones(res);
                w.setMatriculado(mat);
                w.setRepetido(rep);
                w.setAgent(agent);
                batch.add(w);

                if ("Cerrado".equals(estado)) cerrados++;
                if (mat) matriculados++;
            }

            repo.saveAll(batch);
            return new ImportResult(batch.size(), cerrados, matriculados);
        }
    }

    // ── Resolución de columnas por nombre normalizado ────────────
    private Map<String, Integer> mapColumns(Row header) {
        Map<String, Integer> map = new HashMap<>();
        for (int c = header.getFirstCellNum(); c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            if (cell == null) continue;
            String key = normalize(strVal(cell));
            if (!key.isEmpty()) map.putIfAbsent(key, c);
        }
        return map;
    }

    private int col(Map<String, Integer> cols, String key) {
        Integer i = cols.get(key);
        if (i == null) throw new IllegalArgumentException("Falta la columna '" + key + "' en la hoja Detalle1.");
        return i;
    }

    // ── Helpers de celdas ────────────────────────────────────────
    private Cell cell(Row row, int idx) { return idx < 0 ? null : row.getCell(idx); }

    private String strVal(Cell c) {
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try { yield c.getStringCellValue(); }
                catch (Exception e) { yield String.valueOf(c.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    private Integer intVal(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return (int) c.getNumericCellValue();
            String s = strVal(c).trim();
            if (s.isEmpty()) return null;
            return (int) Double.parseDouble(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** "Fecha real": celda fecha, o texto YYYY-MM-DD, o serial Excel. */
    private LocalDate dateFrom(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) {
                if (DateUtil.isCellDateFormatted(c)) {
                    return c.getLocalDateTimeCellValue().toLocalDate();
                }
                return DateUtil.getJavaDate(c.getNumericCellValue())
                        .toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDate();
            }
            String s = strVal(c).trim();
            if (s.length() >= 10) return LocalDate.parse(s.substring(0, 10));
        } catch (Exception ignored) {}
        return null;
    }

    private String parseAgent(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.contains(" - ")) {
            String[] parts = s.split(" - ");
            return String.join(" - ", Arrays.copyOfRange(parts, 1, parts.length)).trim();
        }
        return s.isEmpty() ? "N/A" : s;
    }

    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKD).replaceAll("\\p{M}", "");
        return n.trim().toLowerCase(Locale.ROOT);
    }
}
