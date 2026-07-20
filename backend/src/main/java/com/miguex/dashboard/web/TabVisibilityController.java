package com.miguex.dashboard.web;

import com.miguex.dashboard.dto.TabVisibilityDto;
import com.miguex.dashboard.model.TabVisibility;
import com.miguex.dashboard.repo.TabVisibilityRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Qué pestañas ve el rol VIEWER. GET es de cualquier autenticado (lo necesita el
 * propio VIEWER para filtrar su navbar); PUT sólo ADMIN (ver SecurityConfig).
 */
@RestController
@RequestMapping("/api/tabs")
public class TabVisibilityController {

    private final TabVisibilityRepository repo;

    public TabVisibilityController(TabVisibilityRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/visibility")
    public List<TabVisibilityDto> get() {
        return repo.findAll().stream().map(TabVisibilityDto::from).toList();
    }

    public record UpdateRequest(List<TabVisibilityDto> tabs) {}

    @PutMapping("/visibility")
    @Transactional
    public List<TabVisibilityDto> update(@RequestBody UpdateRequest body) {
        if (body.tabs() != null) {
            for (TabVisibilityDto row : body.tabs()) {
                if (row.tabKey() == null || !TabVisibility.KNOWN_KEYS.contains(row.tabKey())) {
                    continue;
                }
                TabVisibility t = repo.findByTabKey(row.tabKey()).orElseGet(() -> {
                    TabVisibility n = new TabVisibility();
                    n.setTabKey(row.tabKey());
                    return n;
                });
                t.setVisibleForViewer(row.visibleForViewer());
                repo.save(t);
            }
        }
        return get();
    }
}
