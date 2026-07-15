package com.miguex.dashboard.cruce.service;

import com.miguex.dashboard.cruce.dto.CruceData;
import com.miguex.dashboard.cruce.model.NominaVendedor;
import com.miguex.dashboard.cruce.model.VentaMatricula;
import com.miguex.dashboard.cruce.repo.NominaVendedorRepository;
import com.miguex.dashboard.cruce.repo.VentaMatriculaRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.util.*;

/**
 * Cruce de matrículas x ventas: lee los dos .xlsx en el backend y los persiste en la BBDD
 * aparte ({@code cruce}). Detecta el tipo de archivo por sus encabezados (igual que hacía la
 * versión que corría 100% en el navegador), así cualquiera de las dos zonas de carga acepta
 * cualquiera de los dos Excel. Cada carga reemplaza por completo la tabla correspondiente.
 *
 * <p>Todas las operaciones usan el {@code cruceTransactionManager}: nunca tocan el tablero.
 */
@Service
public class CruceService {

    private static final Logger log = LoggerFactory.getLogger(CruceService.class);

    /** POI: formatea cualquier celda como el texto que se ve en Excel (enteros sin ".0"). */
    private static final DataFormatter FORMATTER = new DataFormatter(new Locale("es", "AR"));

    private final NominaVendedorRepository nominaRepo;
    private final VentaMatriculaRepository ventaRepo;

    public CruceService(NominaVendedorRepository nominaRepo, VentaMatriculaRepository ventaRepo) {
        this.nominaRepo = nominaRepo;
        this.ventaRepo = ventaRepo;
    }

    public enum Tipo { NOMINA, VENTAS }

    public record UploadResult(Tipo tipo, int filas) {}

    /**
     * Parsea el Excel subido, detecta si es Nómina o Ventas por sus columnas, y reemplaza la
     * tabla correspondiente en la BBDD del cruce.
     *
     * @throws IllegalArgumentException si no se reconocen las columnas del archivo.
     */
    @Transactional("cruceTransactionManager")
    public UploadResult guardar(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            for (Sheet sheet : wb) {
                Row header = sheet.getRow(sheet.getFirstRowNum());
                if (header == null) continue;
                Map<String, Integer> cols = headerIndex(header);

                if (cols.containsKey("neotel") && cols.containsKey("semana")) {
                    return guardarVentas(sheet, cols);
                }
                if (cols.containsKey("u") && cols.containsKey("vendedor") && cols.containsKey("campana")) {
                    return guardarNomina(sheet, cols);
                }
            }
        }
        throw new IllegalArgumentException(
                "No pude reconocer las columnas del archivo \"" + file.getOriginalFilename() + "\". " +
                        "Se esperan Nómina (U, Vendedor, Lider, Campaña) o Ventas (Neotel, Dia, Mes, Semana, Nombre de carrera).");
    }

    private UploadResult guardarNomina(Sheet sheet, Map<String, Integer> cols) {
        int idxU = cols.get("u");
        int idxVendedor = cols.getOrDefault("vendedor", -1);
        int idxLider = cols.getOrDefault("lider", -1);
        int idxCampania = cols.get("campana");
        int idxEstado = cols.getOrDefault("estado", -1);

        List<NominaVendedor> filas = new ArrayList<>();
        for (int i = sheet.getFirstRowNum() + 1; i <= sheet.getLastRowNum(); i++) {
            Row r = sheet.getRow(i);
            if (r == null) continue;
            String u = cell(r, idxU);
            if (u.isEmpty()) continue;
            NominaVendedor n = new NominaVendedor();
            n.setU(u);
            n.setVendedor(cell(r, idxVendedor));
            n.setLider(cell(r, idxLider));
            n.setCampania(cell(r, idxCampania));
            n.setEstado(cell(r, idxEstado));
            filas.add(n);
        }

        nominaRepo.deleteAllInBatch();
        nominaRepo.saveAll(filas);
        log.info("Cruce: nómina reemplazada — {} vendedores", filas.size());
        return new UploadResult(Tipo.NOMINA, filas.size());
    }

    private UploadResult guardarVentas(Sheet sheet, Map<String, Integer> cols) {
        int idxNeotel = cols.get("neotel");
        int idxMes = cols.containsKey("mes real") ? cols.get("mes real") : cols.getOrDefault("mes", -1);
        int idxSemana = cols.get("semana");
        int idxDia = cols.getOrDefault("dia", -1);
        int idxCarrera = cols.getOrDefault("nombre de carrera", -1);

        List<VentaMatricula> filas = new ArrayList<>();
        for (int i = sheet.getFirstRowNum() + 1; i <= sheet.getLastRowNum(); i++) {
            Row r = sheet.getRow(i);
            if (r == null) continue;
            String neotel = cell(r, idxNeotel);
            if (neotel.isEmpty()) continue;
            VentaMatricula v = new VentaMatricula();
            v.setNeotel(neotel);
            v.setMes(cell(r, idxMes));
            v.setSemana(cell(r, idxSemana));
            v.setDia(cell(r, idxDia));
            v.setCarrera(cell(r, idxCarrera));
            filas.add(v);
        }

        ventaRepo.deleteAllInBatch();
        ventaRepo.saveAll(filas);
        log.info("Cruce: ventas reemplazadas — {} matrículas", filas.size());
        return new UploadResult(Tipo.VENTAS, filas.size());
    }

    /** Devuelve todo lo guardado para que el front arme la tabla y los KPI. */
    @Transactional(value = "cruceTransactionManager", readOnly = true)
    public CruceData data() {
        List<CruceData.Nomina> nomina = nominaRepo.findAll().stream()
                .map(n -> new CruceData.Nomina(n.getU(), n.getVendedor(), n.getLider(), n.getCampania(), n.getEstado()))
                .toList();
        List<CruceData.Venta> ventas = ventaRepo.findAll().stream()
                .map(v -> new CruceData.Venta(v.getNeotel(), v.getMes(), v.getSemana(), v.getDia(), v.getCarrera()))
                .toList();
        return new CruceData(nomina, ventas);
    }

    /** Vacía las dos tablas del cruce (botón "Limpiar datos" del front). */
    @Transactional("cruceTransactionManager")
    public void limpiar() {
        nominaRepo.deleteAllInBatch();
        ventaRepo.deleteAllInBatch();
        log.info("Cruce: datos borrados");
    }

    /** Mapa encabezado-normalizado -> índice de columna, a partir de la primera fila. */
    private static Map<String, Integer> headerIndex(Row header) {
        Map<String, Integer> cols = new HashMap<>();
        for (int c = header.getFirstCellNum(); c < header.getLastCellNum(); c++) {
            String h = normalizeHeader(cell(header, c));
            if (!h.isEmpty()) cols.putIfAbsent(h, c);
        }
        return cols;
    }

    /** trim + minúsculas + sin acentos, igual que la normalización que hacía el JS del navegador. */
    private static String normalizeHeader(String h) {
        String n = Normalizer.normalize(h.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return n.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    private static String cell(Row row, int idx) {
        if (idx < 0 || row == null) return "";
        Cell cell = row.getCell(idx);
        if (cell == null) return "";
        return FORMATTER.formatCellValue(cell).trim();
    }
}
