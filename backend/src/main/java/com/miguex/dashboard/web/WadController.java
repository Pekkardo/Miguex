package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.WadDto;
import com.miguex.dashboard.repo.WadChatRepository;
import com.miguex.dashboard.service.WadImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Endpoints del reporte "Tablero WhatsApp WAD". */
@RestController
@RequestMapping("/api/wad")
public class WadController {

    private final WadImportService importService;
    private final WadChatRepository repo;

    public WadController(WadImportService importService, WadChatRepository repo) {
        this.importService = importService;
        this.repo = repo;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "rows", repo.count());
    }

    /** Sube y procesa el Excel WAD (hoja Detalle1). */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío."));
        }
        try {
            WadImportService.ImportResult r = importService.importExcel(file);
            return ResponseEntity.ok(Map.of(
                    "chats", r.chats(),
                    "cerrados", r.cerrados(),
                    "matriculados", r.matriculados()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo procesar el Excel: " + e.getMessage()));
        }
    }

    /** Devuelve todos los chats en el formato que consume el front-end. */
    @GetMapping("/data")
    public List<WadDto> data() {
        return repo.findAll().stream().map(WadDto::from).toList();
    }
}
