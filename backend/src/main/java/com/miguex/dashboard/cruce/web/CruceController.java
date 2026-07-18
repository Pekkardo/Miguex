package com.miguex.dashboard.cruce.web;

import com.miguex.dashboard.cruce.dto.CruceData;
import com.miguex.dashboard.cruce.service.CruceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * API del cruce de matrículas x ventas (ruta /cruce del tablero). Está aislada del resto del
 * tablero: persiste en su propia BBDD ({@code cruce}) y no toca llamadas ni chats.
 *
 * <p>nginx hace proxy de {@code /api/} al backend, así que el front pega a {@code /api/cruce/...}.
 */
@RestController
@RequestMapping("/api/cruce")
public class CruceController {

    private static final Logger log = LoggerFactory.getLogger(CruceController.class);

    private final CruceService service;

    public CruceController(CruceService service) {
        this.service = service;
    }

    /**
     * Recibe uno de los dos Excel (multipart, campo {@code file}), detecta si es Nómina o Ventas
     * por sus columnas y reemplaza la tabla correspondiente en la BBDD del cruce.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se recibió ningún archivo."));
        }
        try {
            CruceService.UploadResult r = service.guardar(file);
            return ResponseEntity.ok(Map.of(
                    "tipo", r.tipo().name().toLowerCase(),
                    "filas", r.filas()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // POI lanza excepciones (p.ej. NotOfficeXmlFileException) si el archivo no es un .xlsx
            // real; lo devolvemos como error del cliente en vez de un 500 con stacktrace.
            log.error("Cruce: error leyendo el Excel \"{}\": {}", file.getOriginalFilename(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo leer el archivo. ¿Es un .xlsx válido?"));
        }
    }

    /** Todo lo guardado (nómina + ventas), para que el front arme la tabla y los KPI. */
    @GetMapping("/data")
    public CruceData data() {
        return service.data();
    }

    /** Vacía las dos tablas del cruce. */
    @DeleteMapping("/data")
    public ResponseEntity<Map<String, String>> limpiar() {
        service.limpiar();
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
