package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.TabVisibility;

public record TabVisibilityDto(String tabKey, boolean visibleForViewer) {
    public static TabVisibilityDto from(TabVisibility t) {
        return new TabVisibilityDto(t.getTabKey(), t.isVisibleForViewer());
    }
}
