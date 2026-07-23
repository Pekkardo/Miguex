package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.DatosBundle;
import com.miguex.dashboard.dto.DatosDto;
import com.miguex.dashboard.repo.Datos0800Repository;
import com.miguex.dashboard.repo.DatosChatsRepository;
import com.miguex.dashboard.repo.DatosLeadsRepository;
import com.miguex.dashboard.service.DatosImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Endpoints del tablero "Datos" (0800 · Leads · Chats). Un único {@code /upload} con el
 * canal como parámetro: así el path queda en un segmento antes de "/upload" y calza con
 * la regla {@code /api/*&#47;upload} = solo ADMIN de SecurityConfig (no hace falta tocarla).
 */
@RestController
@RequestMapping("/api/datos")
public class DatosController {

    private final DatosImportService importService;
    private final Datos0800Repository repo0800;
    private final DatosLeadsRepository repoLeads;
    private final DatosChatsRepository repoChats;

    public DatosController(DatosImportService importService,
                           Datos0800Repository repo0800,
                           DatosLeadsRepository repoLeads,
                           DatosChatsRepository repoChats) {
        this.importService = importService;
        this.repo0800 = repo0800;
        this.repoLeads = repoLeads;
        this.repoChats = repoChats;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "c0800", repo0800.count(),
                "leads", repoLeads.count(),
                "chats", repoChats.count()
        );
    }

    /** Sube y procesa el Excel de un canal ({@code 0800} | {@code leads} | {@code chats}). */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam("canal") String canal) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Archivo vacío."));
        }
        String c = canal == null ? "" : canal.trim().toLowerCase(Locale.ROOT);
        try {
            int rows = switch (c) {
                case "0800" -> importService.import0800(file);
                case "leads" -> importService.importLeads(file);
                case "chats" -> importService.importChats(file);
                default -> throw new IllegalArgumentException("Canal inválido: '" + canal + "' (esperado 0800 | leads | chats).");
            };
            return ResponseEntity.ok(Map.of("canal", c, "rows", rows));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "No se pudo procesar el Excel: " + e.getMessage()));
        }
    }

    /** Las 3 fuentes en una sola respuesta; el front las etiqueta por canal. */
    @GetMapping("/data")
    public DatosBundle data() {
        List<DatosDto> c0800 = repo0800.findAll().stream().map(DatosDto::from).toList();
        List<DatosDto> leads = repoLeads.findAll().stream().map(DatosDto::from).toList();
        List<DatosDto> chats = repoChats.findAll().stream().map(DatosDto::from).toList();
        return new DatosBundle(c0800, leads, chats);
    }
}
