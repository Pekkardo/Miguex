package com.miguex.dashboard.service;

import com.miguex.dashboard.model.EggChat;
import com.miguex.dashboard.repo.EggChatRepository;
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
 * Lee el Excel del tablero de Admisiones (Egg) y persiste los chats en MySQL.
 * Detecta automáticamente la hoja de detalle (la que tenga las columnas
 * "Fecha real" y "salientes") y replica el mapeo del HTML original.
 */
@Service
public class EggImportService {

    private final EggChatRepository repo;

    public EggImportService(EggChatRepository repo) {
        this.repo = repo;
    }

    public record ImportResult(int chats, int respondidos, int noRespondidos) {}

    @Transactional
    public ImportResult importExcel(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            Sheet ws = pickSheet(wb);
            if (ws == null) {
                throw new IllegalArgumentException(
                        "No se encontró una hoja con las columnas 'Fecha real' y 'salientes'.");
            }

            Row header = ws.getRow(ws.getFirstRowNum());
            Map<String, Integer> cols = mapColumns(header);

            int cFecha  = col(cols, "fecha real");
            int cDia    = cols.getOrDefault("dia", -1);
            int cMes    = cols.getOrDefault("mes", -1);
            int cTel    = cols.getOrDefault("telefono", -1);
            int cRep    = cols.getOrDefault("repetidos", -1);
            int cRes    = cols.getOrDefault("resolucion v2", -1);
            int cSal    = col(cols, "salientes");
            int cEstado = cols.getOrDefault("estado", -1);
            int cCanal  = cols.getOrDefault("canal", -1);
            int cUser   = cols.getOrDefault("usuario", -1);
            int cCamp   = cols.getOrDefault("campana", -1);
            int cSub    = cols.getOrDefault("subcategoria", -1);

            repo.deleteAllInBatch();

            List<EggChat> batch = new ArrayList<>();
            int respondidos = 0, noRespondidos = 0;

            for (int i = ws.getFirstRowNum() + 1; i <= ws.getLastRowNum(); i++) {
                Row row = ws.getRow(i);
                if (row == null) continue;

                LocalDate fecha = dateFrom(cell(row, cFecha));
                Long tel = longVal(cell(row, cTel));
                if (fecha == null && tel == null) continue;

                String sal = strVal(cell(row, cSal)).trim().toUpperCase(Locale.ROOT);

                EggChat e = new EggChat();
                e.setFecha(fecha);
                e.setDia(intVal(cell(row, cDia)));
                e.setMes(intVal(cell(row, cMes)));
                e.setTelefono(tel);
                e.setRepetidos(strVal(cell(row, cRep)).trim());
                e.setResolucionV2(strVal(cell(row, cRes)).trim());
                e.setSalientes(sal);
                e.setEstado(strVal(cell(row, cEstado)).trim());
                e.setCanal(strVal(cell(row, cCanal)).trim());
                e.setUsuario(strVal(cell(row, cUser)).trim());
                e.setCampana(strVal(cell(row, cCamp)).trim());
                e.setSubCategoria(strVal(cell(row, cSub)).trim());
                batch.add(e);

                if ("SI".equals(sal)) respondidos++;
                else if ("NO".equals(sal)) noRespondidos++;
            }

            repo.saveAll(batch);
            return new ImportResult(batch.size(), respondidos, noRespondidos);
        }
    }

    /** Elige la hoja cuyo encabezado contenga "fecha real" y "salientes". */
    private Sheet pickSheet(Workbook wb) {
        for (int s = 0; s < wb.getNumberOfSheets(); s++) {
            Sheet ws = wb.getSheetAt(s);
            Row header = ws.getRow(ws.getFirstRowNum());
            if (header == null) continue;
            Map<String, Integer> cols = mapColumns(header);
            if (cols.containsKey("fecha real") && cols.containsKey("salientes")) {
                return ws;
            }
        }
        return null;
    }

    // ── Resolución de columnas por nombre normalizado ────────────
    private Map<String, Integer> mapColumns(Row header) {
        Map<String, Integer> map = new HashMap<>();
        if (header == null) return map;
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
        if (i == null) throw new IllegalArgumentException("Falta la columna '" + key + "' en la hoja.");
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

    private Long longVal(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return (long) c.getNumericCellValue();
            String s = strVal(c).trim();
            if (s.isEmpty()) return null;
            return (long) Double.parseDouble(s);
        } catch (Exception e) {
            return null;
        }
    }

    /** "Fecha real": celda fecha, fórmula, texto YYYY-MM-DD, o serial Excel. */
    private LocalDate dateFrom(Cell c) {
        if (c == null) return null;
        try {
            CellType type = c.getCellType();
            if (type == CellType.FORMULA) type = c.getCachedFormulaResultType();
            if (type == CellType.NUMERIC) {
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

    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKD).replaceAll("\\p{M}", "");
        return n.trim().toLowerCase(Locale.ROOT);
    }
}
