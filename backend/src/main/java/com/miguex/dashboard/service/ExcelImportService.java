package com.miguex.dashboard.service;

import com.miguex.dashboard.model.CallRecord;
import com.miguex.dashboard.model.Matricula;
import com.miguex.dashboard.repo.CallRecordRepository;
import com.miguex.dashboard.repo.MatriculaRepository;
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
 * Lee el Excel "EJECUTIVO 0800" y persiste las llamadas en MySQL.
 * Replica exactamente la lógica de parseo que tenía el front-end:
 *  - sólo filas con CRM 37 o 50
 *  - conectada = (Conexión == "Conectadas")
 *  - matriculado = MATRICULAS.contains(ANI) si hay matrículas, si no Matriculado==1
 *  - agente = parte luego de " - " del campo Usuario
 */
@Service
public class ExcelImportService {

    private final CallRecordRepository callRepo;
    private final MatriculaRepository matriculaRepo;

    public ExcelImportService(CallRecordRepository callRepo, MatriculaRepository matriculaRepo) {
        this.callRepo = callRepo;
        this.matriculaRepo = matriculaRepo;
    }

    public record ImportResult(int calls, int connected, int matriculas) {}

    @Transactional
    public ImportResult importExcel(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            // 1) Hoja MATRICULAS -> set de teléfonos
            Set<String> matSet = readMatriculas(wb);

            // 2) Hoja info -> filas de llamadas
            Sheet info = wb.getSheet("info");
            if (info == null) {
                info = wb.getSheetAt(0);
            }
            if (info == null) {
                throw new IllegalArgumentException("El archivo no tiene la hoja 'info'.");
            }

            Row header = info.getRow(info.getFirstRowNum());
            if (header == null) {
                throw new IllegalArgumentException("La hoja 'info' no tiene encabezados.");
            }
            Map<String, List<Integer>> cols = mapColumns(header);

            int cCrm   = lastCol(cols, "crm");          // hay 'Crm' y 'CRM'; el front usa el último
            int cConn  = firstCol(cols, "conexion");    // hay dos 'Conexión'; el front usa el primero
            int cMat   = firstCol(cols, "matriculado");
            int cFecha = firstCol(cols, "fecha");
            int cInicio = firstCol(cols, "inicio");
            int cAni   = firstCol(cols, "ani/telefono");
            int cUser  = firstCol(cols, "usuario");
            int cDur   = firstCol(cols, "duracion");
            int cTipo  = firstCol(cols, "tipo");

            // limpiar datos previos
            callRepo.deleteAllInBatch();

            List<CallRecord> batch = new ArrayList<>();
            int connected = 0;

            for (int i = info.getFirstRowNum() + 1; i <= info.getLastRowNum(); i++) {
                Row row = info.getRow(i);
                if (row == null) continue;

                Integer crm = intVal(cell(row, cCrm));
                if (crm == null || (crm != 37 && crm != 50)) continue;

                boolean conn = "conectadas".equals(
                        normalize(strVal(cell(row, cConn))));

                Integer hora = hourFromInicio(cell(row, cInicio));

                LocalDate fecha = dateFromFecha(cell(row, cFecha));
                Integer dow = (fecha != null) ? jsDow(fecha) : null;

                String ani = strVal(cell(row, cAni)).trim();
                boolean mat;
                if (!matSet.isEmpty()) {
                    mat = matSet.contains(ani);
                } else {
                    Integer m = intVal(cell(row, cMat));
                    mat = m != null && m == 1;
                }

                String agent = parseAgent(strVal(cell(row, cUser)));

                Integer dur = intVal(cell(row, cDur));
                if (dur == null) dur = 0;

                String tipo = strVal(cell(row, cTipo)).trim();

                CallRecord rec = new CallRecord();
                rec.setConectada(conn);
                rec.setHora(hora);
                rec.setFecha(fecha);
                rec.setDow(dow);
                rec.setMatriculado(mat);
                rec.setAgent(agent);
                rec.setDuracion(dur);
                rec.setTipo(tipo);
                rec.setAni(ani);
                batch.add(rec);
                if (conn) connected++;
            }

            callRepo.saveAll(batch);
            return new ImportResult(batch.size(), connected, matSet.size());
        }
    }

    // ── MATRICULAS ───────────────────────────────────────────────
    private Set<String> readMatriculas(Workbook wb) {
        Set<String> set = new HashSet<>();
        Sheet ws = wb.getSheet("MATRICULAS");
        if (ws == null) return set;

        // persistir también la tabla matricula (referencia)
        matriculaRepo.deleteAllInBatch();
        List<Matricula> toSave = new ArrayList<>();

        for (int i = ws.getFirstRowNum() + 1; i <= ws.getLastRowNum(); i++) {
            Row row = ws.getRow(i);
            if (row == null) continue;
            String tel = strVal(row.getCell(0)).trim();
            if (!tel.isEmpty()) {
                if (set.add(tel)) {
                    toSave.add(new Matricula(tel));
                }
            }
        }
        if (!toSave.isEmpty()) matriculaRepo.saveAll(toSave);
        return set;
    }

    // ── Resolución de columnas por nombre normalizado ────────────
    private Map<String, List<Integer>> mapColumns(Row header) {
        Map<String, List<Integer>> map = new HashMap<>();
        for (int c = header.getFirstCellNum(); c < header.getLastCellNum(); c++) {
            Cell cell = header.getCell(c);
            if (cell == null) continue;
            String key = normalize(strVal(cell));
            if (key.isEmpty()) continue;
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(c);
        }
        return map;
    }

    private int firstCol(Map<String, List<Integer>> cols, String key) {
        List<Integer> l = cols.get(key);
        if (l == null || l.isEmpty())
            throw new IllegalArgumentException("Falta la columna '" + key + "' en la hoja info.");
        return l.get(0);
    }

    private int lastCol(Map<String, List<Integer>> cols, String key) {
        List<Integer> l = cols.get(key);
        if (l == null || l.isEmpty())
            throw new IllegalArgumentException("Falta la columna '" + key + "' en la hoja info.");
        return l.get(l.size() - 1);
    }

    // ── Helpers de celdas ────────────────────────────────────────
    private Cell cell(Row row, int idx) {
        return idx < 0 ? null : row.getCell(idx);
    }

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

    /** Hora del campo Inicio (puede ser fecha-hora o fracción de día). */
    private Integer hourFromInicio(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) {
                if (DateUtil.isCellDateFormatted(c)) {
                    return c.getLocalDateTimeCellValue().getHour();
                }
                double v = c.getNumericCellValue();
                double frac = v - Math.floor(v);
                return (int) Math.floor(frac * 24);
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** Campo Fecha en formato numérico YYYYMMDD. */
    private LocalDate dateFromFecha(Cell c) {
        if (c == null) return null;
        String s = strVal(c).trim();
        if (s.length() == 8 && s.chars().allMatch(Character::isDigit)) {
            try {
                int y = Integer.parseInt(s.substring(0, 4));
                int m = Integer.parseInt(s.substring(4, 6));
                int d = Integer.parseInt(s.substring(6, 8));
                return LocalDate.of(y, m, d);
            } catch (Exception ignored) {}
        }
        return null;
    }

    /** Día de la semana en convención JavaScript: 0=Dom ... 6=Sáb. */
    private Integer jsDow(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7; // Mon(1)..Sun(7) -> 1..6,0
    }

    /** "8861 - Caceres, Martina" -> "Caceres, Martina". */
    private String parseAgent(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.contains(" - ")) {
            String[] parts = s.split(" - ");
            return String.join(" - ", Arrays.copyOfRange(parts, 1, parts.length)).trim();
        }
        return s.isEmpty() ? "Desconocido" : s;
    }

    /** minúsculas sin acentos, para comparar nombres de columnas/valores. */
    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "");
        return n.trim().toLowerCase(Locale.ROOT);
    }
}
