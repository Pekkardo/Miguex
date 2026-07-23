package com.miguex.dashboard.service;

import com.miguex.dashboard.model.Datos0800Record;
import com.miguex.dashboard.model.DatosChatsRecord;
import com.miguex.dashboard.model.DatosLeadsRecord;
import com.miguex.dashboard.repo.Datos0800Repository;
import com.miguex.dashboard.repo.DatosChatsRepository;
import com.miguex.dashboard.repo.DatosLeadsRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee los 3 Excel del tablero "Datos" y persiste cada canal en su tabla. Porta a
 * Apache POI la misma lógica de parseo que tenían los HTML autónomos (detección de la
 * fila de encabezado, columnas por nombre, parseo de fecha y día de la semana).
 * Cada import es "reemplazo total" del canal: {@code deleteAllInBatch()} + {@code saveAll()}.
 */
@Service
public class DatosImportService {

    private final Datos0800Repository repo0800;
    private final DatosLeadsRepository repoLeads;
    private final DatosChatsRepository repoChats;

    public DatosImportService(Datos0800Repository repo0800,
                              DatosLeadsRepository repoLeads,
                              DatosChatsRepository repoChats) {
        this.repo0800 = repo0800;
        this.repoLeads = repoLeads;
        this.repoChats = repoChats;
    }

    /** Fila normalizada intermedia, común a los 3 canales. */
    private record Parsed(LocalDate fecha, String semana, String turno, String dia) {}

    // ── 0800 ─────────────────────────────────────────────────────────────
    // header con "fecha real"; turno en col "Lider" (o "Turno"); día derivado.
    @Transactional
    public int import0800(MultipartFile file) throws Exception {
        List<Parsed> rows = parse(file, "fecha real", "fecha real", "semana",
                List.of("lider", "turno"), null, null);
        repo0800.deleteAllInBatch();
        List<Datos0800Record> batch = new ArrayList<>(rows.size());
        for (Parsed p : rows) {
            Datos0800Record r = new Datos0800Record();
            r.setFecha(p.fecha()); r.setSemana(p.semana()); r.setTurno(p.turno()); r.setDia(p.dia());
            batch.add(r);
        }
        repo0800.saveAll(batch);
        return batch.size();
    }

    // ── Leads ────────────────────────────────────────────────────────────
    // header con "fecha"; columnas fecha / Semana / Turno; día derivado.
    @Transactional
    public int importLeads(MultipartFile file) throws Exception {
        List<Parsed> rows = parse(file, "fecha", "fecha", "semana",
                List.of("turno"), null, null);
        repoLeads.deleteAllInBatch();
        List<DatosLeadsRecord> batch = new ArrayList<>(rows.size());
        for (Parsed p : rows) {
            DatosLeadsRecord r = new DatosLeadsRecord();
            r.setFecha(p.fecha()); r.setSemana(p.semana()); r.setTurno(p.turno()); r.setDia(p.dia());
            batch.add(r);
        }
        repoLeads.saveAll(batch);
        return batch.size();
    }

    // ── Chats ────────────────────────────────────────────────────────────
    // header con "Fecha real"; columnas Fecha real / Semanas / Usuario / Turno;
    // día de "Dia Nombre"/"Dia" (o derivado). Se saltan filas sin Usuario.
    @Transactional
    public int importChats(MultipartFile file) throws Exception {
        List<Parsed> rows = parse(file, "fecha real", "fecha real", "semanas",
                List.of("turno"), "usuario", List.of("dia nombre", "dia"));
        repoChats.deleteAllInBatch();
        List<DatosChatsRecord> batch = new ArrayList<>(rows.size());
        for (Parsed p : rows) {
            DatosChatsRecord r = new DatosChatsRecord();
            r.setFecha(p.fecha()); r.setSemana(p.semana()); r.setTurno(p.turno()); r.setDia(p.dia());
            batch.add(r);
        }
        repoChats.saveAll(batch);
        return batch.size();
    }

    // ── Parser genérico ──────────────────────────────────────────────────
    private List<Parsed> parse(MultipartFile file, String markerNorm, String fechaKey, String semanaKey,
                               List<String> turnoKeys, String usuarioKey, List<String> diaKeys) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            Sheet sheet = wb.getSheet("Detalle1");
            if (sheet == null) sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) throw new IllegalArgumentException("El archivo no tiene hojas.");

            int headerIdx = findHeaderRow(sheet, markerNorm);
            if (headerIdx == -1) {
                throw new IllegalArgumentException(
                        "No se encontró la fila de encabezados (\"" + markerNorm + "\"). Verificá el formato del archivo.");
            }

            Map<String, Integer> cols = mapColumns(sheet.getRow(headerIdx));
            int cFecha = need(cols, fechaKey);
            int cSemana = need(cols, semanaKey);
            int cTurno = firstOf(cols, turnoKeys);
            if (cTurno < 0) {
                throw new IllegalArgumentException("Falta la columna de turno (" + String.join("/", turnoKeys) + ").");
            }
            int cUsuario = usuarioKey != null ? need(cols, usuarioKey) : -1;
            int cDia = diaKeys != null ? firstOf(cols, diaKeys) : -1;

            List<Parsed> out = new ArrayList<>();
            for (int i = headerIdx + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                if (cUsuario >= 0 && strVal(row.getCell(cUsuario)).trim().isEmpty()) continue;

                LocalDate fecha = localDateFromCell(row.getCell(cFecha));
                if (fecha == null) continue;

                String semana = strVal(row.getCell(cSemana)).trim();
                String turno = strVal(row.getCell(cTurno)).trim();
                String dia;
                if (cDia >= 0) {
                    String d = strVal(row.getCell(cDia)).trim();
                    dia = (d.isEmpty() || d.matches("\\d+")) ? diaSemana(fecha) : d;
                } else {
                    dia = diaSemana(fecha);
                }
                out.add(new Parsed(fecha, semana, turno, dia));
            }
            if (out.isEmpty()) throw new IllegalArgumentException("El archivo no contiene filas de datos válidas.");
            return out;
        }
    }

    private int findHeaderRow(Sheet sheet, String markerNorm) {
        for (int i = sheet.getFirstRowNum(); i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            for (int c = row.getFirstCellNum(); c >= 0 && c < row.getLastCellNum(); c++) {
                if (markerNorm.equals(normalize(strVal(row.getCell(c))))) return i;
            }
        }
        return -1;
    }

    private Map<String, Integer> mapColumns(Row header) {
        Map<String, Integer> map = new HashMap<>();
        if (header == null) return map;
        for (int c = header.getFirstCellNum(); c >= 0 && c < header.getLastCellNum(); c++) {
            String key = normalize(strVal(header.getCell(c)));
            if (!key.isEmpty()) map.putIfAbsent(key, c); // primer índice, como el front
        }
        return map;
    }

    private int need(Map<String, Integer> cols, String key) {
        Integer idx = cols.get(key);
        if (idx == null) throw new IllegalArgumentException("Falta la columna requerida: '" + key + "'.");
        return idx;
    }

    private int firstOf(Map<String, Integer> cols, List<String> keys) {
        for (String k : keys) {
            Integer idx = cols.get(k);
            if (idx != null) return idx;
        }
        return -1;
    }

    // ── Helpers de celda / fecha ─────────────────────────────────────────
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

    private LocalDate localDateFromCell(Cell c) {
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) {
                if (DateUtil.isCellDateFormatted(c)) return c.getLocalDateTimeCellValue().toLocalDate();
                Date d = DateUtil.getJavaDate(c.getNumericCellValue());
                return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
            }
            if (c.getCellType() == CellType.FORMULA && DateUtil.isCellDateFormatted(c)) {
                return c.getLocalDateTimeCellValue().toLocalDate();
            }
        } catch (Exception ignored) {}
        return parseDateString(strVal(c).trim());
    }

    private static final Pattern ISO = Pattern.compile("^(\\d{4})-(\\d{1,2})-(\\d{1,2})");
    private static final Pattern DMY = Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{4})$");
    private static final Pattern MDY2 = Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{2})$");

    /** Mismos formatos que aceptaba excelValueToFechaStr de los HTML. */
    private LocalDate parseDateString(String s) {
        if (s == null || s.isEmpty()) return null;
        try {
            Matcher m = ISO.matcher(s);
            if (m.find()) return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
            m = DMY.matcher(s); // dd/mm/yyyy
            if (m.find()) return LocalDate.of(Integer.parseInt(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
            m = MDY2.matcher(s); // m/d/yy
            if (m.find()) {
                int yy = Integer.parseInt(m.group(3));
                int year = yy < 70 ? 2000 + yy : 1900 + yy;
                return LocalDate.of(year, Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)));
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static final String[] DIAS = {"Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"};

    private String diaSemana(LocalDate d) {
        return DIAS[d.getDayOfWeek().getValue() % 7]; // Mon(1)..Sun(7) -> 1..6,0
    }

    /** minúsculas sin acentos, para comparar nombres de columnas. */
    private String normalize(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .trim().toLowerCase(Locale.ROOT);
    }
}
