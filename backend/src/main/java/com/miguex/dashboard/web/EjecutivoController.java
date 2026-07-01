package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.EjecutivoDto;
import com.miguex.dashboard.repo.EjecutivoChatRepository;
import com.miguex.dashboard.service.EjecutivoImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Endpoints del reporte "Tablero Ejecutivo" (WhatsApp con tipificaciones completas). */
@RestController
@RequestMapping("/api/ejecutivo")
public class EjecutivoController {

    private final EjecutivoImportService importService;
    private final EjecutivoChatRepository repo;

    public EjecutivoController(EjecutivoImportService importService, EjecutivoChatRepository repo) {
        this.importService = importService;
        this.repo = repo;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "rows", repo.count());
    }

    /** Sube y procesa el Excel Ejecutivo (hoja Detalle1); reemplaza todos los datos. */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío."));
        }
        try {
            EjecutivoImportService.ImportResult r = importService.importExcel(file);
            return ResponseEntity.ok(Map.of(
                    "total", r.total(),
                    "respondidos", r.respondidos(),
                    "noRespondidos", r.noRespondidos(),
                    "resolucionesDistintas", r.resolucionesDistintas()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo procesar el Excel: " + e.getMessage()));
        }
    }

    /** Devuelve todos los chats en el formato que consume el front-end. */
    @GetMapping("/data")
    public List<EjecutivoDto> data() {
        return repo.findAll().stream().map(EjecutivoDto::from).toList();
    }
}
