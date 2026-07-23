package com.miguex.dashboard.model;

import jakarta.persistence.*;

import java.util.List;

/**
 * Qué pestañas del navbar ve el rol VIEWER. El ADMIN siempre ve todas, no es
 * configurable. Vive en este paquete (no en uno propio) por el mismo motivo que
 * {@link User}: {@code MainDbConfig} escanea entidades con
 * {@code .packages("com.miguex.dashboard.model")} hardcodeado.
 */
@Entity
@Table(name = "tab_visibility")
public class TabVisibility {

    /** Debe coincidir exactamente con los id de PAGES en pages.ts (frontend). */
    public static final List<String> KNOWN_KEYS = List.of("dashboard0800", "wad", "egg", "cruce", "datos");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String tabKey;

    @Column(nullable = false)
    private boolean visibleForViewer = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTabKey() { return tabKey; }
    public void setTabKey(String tabKey) { this.tabKey = tabKey; }

    public boolean isVisibleForViewer() { return visibleForViewer; }
    public void setVisibleForViewer(boolean visibleForViewer) { this.visibleForViewer = visibleForViewer; }
}
