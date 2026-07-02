package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.EggDto;
import com.miguex.dashboard.repo.EggChatRepository;
import com.miguex.dashboard.service.EggImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** Endpoints del tablero de Admisiones (Egg / WhatsApp). */
@RestController
@RequestMapping("/api/egg")
public class EggController {

    private final EggImportService importService;
    private final EggChatRepository repo;

    public EggController(EggImportService importService, EggChatRepository repo) {
        this.importService = importService;
        this.repo = repo;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "rows", repo.count());
    }

    /** Sube y procesa el Excel, reemplazando los datos guardados. */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío."));
        }
        try {
            EggImportService.ImportResult r = importService.importExcel(file);
            return ResponseEntity.ok(Map.of(
                    "chats", r.chats(),
                    "respondidos", r.respondidos(),
                    "noRespondidos", r.noRespondidos()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo procesar el Excel: " + e.getMessage()));
        }
    }

    /** Devuelve todos los chats en el formato que consume el HTML (RAW_DATA). */
    @GetMapping("/data")
    public List<EggDto> data() {
        return repo.findAll().stream().map(EggDto::from).toList();
    }
}
