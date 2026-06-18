package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.CallDto;
import com.miguex.dashboard.repo.CallRecordRepository;
import com.miguex.dashboard.service.ChatService;
import com.miguex.dashboard.service.ExcelImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final ExcelImportService importService;
    private final ChatService chatService;
    private final CallRecordRepository callRepo;

    public ApiController(ExcelImportService importService,
                         ChatService chatService,
                         CallRecordRepository callRepo) {
        this.importService = importService;
        this.chatService = chatService;
        this.callRepo = callRepo;
    }

    /** Salud simple para la UI / healthchecks. */
    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "rows", callRepo.count(),
                "chatEnabled", chatService.isEnabled()
        );
    }

    /** Sube y procesa el Excel del día. */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío."));
        }
        try {
            ExcelImportService.ImportResult r = importService.importExcel(file);
            return ResponseEntity.ok(Map.of(
                    "calls", r.calls(),
                    "connected", r.connected(),
                    "matriculas", r.matriculas()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo procesar el Excel: " + e.getMessage()));
        }
    }

    /** Devuelve todas las filas en el formato que consume el front-end. */
    @GetMapping("/data")
    public List<CallDto> data() {
        return callRepo.findAll().stream().map(CallDto::from).toList();
    }

    /** Proxy de chat con IA. */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body) {
        String system = body.getOrDefault("system", "");
        String message = body.getOrDefault("message", "");
        try {
            String reply = chatService.chat(system, message);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
