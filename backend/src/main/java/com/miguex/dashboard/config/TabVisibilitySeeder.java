package com.miguex.dashboard.config;

import com.miguex.dashboard.model.TabVisibility;
import com.miguex.dashboard.repo.TabVisibilityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Crea al arrancar una fila por cada pestaña conocida que todavía no tenga una
 * (idempotente, igual que AdminSeeder). Por defecto todo visible para VIEWER: nada
 * se oculta hasta que un ADMIN lo decida explícitamente.
 */
@Component
public class TabVisibilitySeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TabVisibilitySeeder.class);

    private final TabVisibilityRepository repo;

    public TabVisibilitySeeder(TabVisibilityRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (String key : TabVisibility.KNOWN_KEYS) {
            if (repo.findByTabKey(key).isPresent()) {
                continue;
            }
            TabVisibility t = new TabVisibility();
            t.setTabKey(key);
            t.setVisibleForViewer(true);
            repo.save(t);
            log.info("Visibilidad de pestaña '{}' sembrada (visible para VIEWER).", key);
        }
    }
}
