package com.miguex.dashboard.service;

import com.miguex.dashboard.model.EjecutivoChat;
import com.miguex.dashboard.repo.EjecutivoChatRepository;
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
 * Lee el Excel del reporte "Ejecutivo" (hoja "Detalle1") y persiste los chats en MySQL,
 * reemplazando siempre el contenido anterior. Columnas esperadas: Fecha real, Dia, Mes,
 * Telefono, Repetidos, Resolucion V2, salientes, Estado, Usuario, SubCategoria
 * (Canal y Campaña son opcionales).
 */
@Service
public class EjecutivoImportService {

    private final EjecutivoChatRepository repo;

    public EjecutivoImportService(EjecutivoChatRepository repo) {
        this.repo = repo;
    }

    public record ImportResult(int total, int respondidos, int noRespondidos, int resolucionesDistintas) {}

    private static final String[] REQUIRED = {
            "fecha real", "dia", "mes", "telefono", "repetidos",
            "resolucion v2", "salientes", "estado", "usuario", "subcategoria"
    };

    @Transactional
    public ImportResult importExcel(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            Sheet ws = wb.getSheet("Detalle1");
            if (ws == null) ws = wb.getSheetAt(0);
            if (ws == null) throw new IllegalArgumentException("El archivo no tiene hojas.");

            Row header = ws.getRow(ws.getFirstRowNum());
            if (header == null) throw new IllegalArgumentException("No se encontró la fila de encabezados.");
            Map<String, Integer> cols = mapColumns(header);

            List<String> missing = new ArrayList<>();
            for (String req : REQUIRED) if (!cols.containsKey(req)) missing.add(req);
            if (!missing.isEmpty()) {
                throw new IllegalArgumentException("Faltan columnas en el Excel: " + String.join(", ", missing));
            }

            int cFecha = cols.get("fecha real");
            int cDia = cols.get("dia");
            int cMes = cols.get("mes");
            int cTel = cols.get("telefono");
            int cRep = cols.get("repetidos");
            int cRes = cols.get("resolucion v2");
            int cSal = cols.get("salientes");
            int cEstado = cols.get("estado");
            int cUsuario = cols.get("usuario");
            int cSub = cols.get("subcategoria");
            int cCanal = cols.getOrDefault("canal", -1);        // opcional
            int cCampana = cols.getOrDefault("campana", -1);    // opcional

            repo.deleteAllInBatch();

            List<EjecutivoChat> batch = new ArrayList<>();
            int respondidos = 0, noRespondidos = 0;
            Set<String> resolucionesSet = new HashSet<>();

            for (int i = ws.getFirstRowNum() + 1; i <= ws.getLastRowNum(); i++) {
                Row row = ws.getRow(i);
                if (row == null) continue;

                LocalDate fecha = dateFrom(cell(row, cFecha));
                if (fecha == null) continue;

                String salientes = strVal(cell(row, cSal)).trim();
                String resolucion = strVal(cell(row, cRes)).trim();

                EjecutivoChat c = new EjecutivoChat();
                c.setFechaReal(fecha);
                c.setDia(intVal(cell(row, cDia)));
                c.setMes(intVal(cell(row, cMes)));
                c.setTelefono(longVal(cell(row, cTel)));
                c.setRepetidos(strVal(cell(row, cRep)).trim());
                c.setResolucionV2(resolucion);
                c.setSalientes(salientes);
                c.setEstado(strVal(cell(row, cEstado)).trim());
                c.setCanal(cCanal >= 0 ? strVal(cell(row, cCanal)).trim() : "");
                c.setUsuario(strVal(cell(row, cUsuario)).trim());
                c.setCampana(cCampana >= 0 ? strVal(cell(row, cCampana)).trim() : "");
                c.setSubCategoria(strVal(cell(row, cSub)).trim());
                batch.add(c);

                if ("SI".equalsIgnoreCase(salientes)) respondidos++; else noRespondidos++;
                if (!resolucion.isEmpty()) resolucionesSet.add(resolucion);
            }

            repo.saveAll(batch);
            return new ImportResult(batch.size(), respondidos, noRespondidos, resolucionesSet.size());
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
            if (c.getCellType() == CellType.NUMERIC) return (int) Math.round(c.getNumericCellValue());
            String s = strVal(c).trim();
            if (s.isEmpty()) return null;
            return (int) Math.round(Double.parseDouble(s));
        } catch (Exception e) {
            return null;
        }
    }

    private Long longVal(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return Math.round(c.getNumericCellValue());
            String s = strVal(c).replaceAll("[^0-9.-]", "").trim();
            if (s.isEmpty() || s.equals("-")) return null;
            return Math.round(Double.parseDouble(s));
        } catch (Exception e) {
            return null;
        }
    }

    /** "Fecha real": celda fecha, texto YYYY-MM-DD, o serial Excel. */
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

    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKD).replaceAll("\\p{M}", "");
        return n.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
