package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.WadChat;

/**
 * Fila tal cual la consume el front-end del reporte WAD
 * (mismas claves que el objeto del HTML original).
 */
public record WadDto(
        String dk,
        String dia,
        Integer h,
        String ec,
        String res,
        int mat,
        int rep,
        String ag
) {
    public static WadDto from(WadChat w) {
        return new WadDto(
                w.getFecha() != null ? w.getFecha().toString() : "",
                w.getDia(),
                w.getHora(),
                w.getEstadoChat(),
                w.getResoluciones(),
                w.isMatriculado() ? 1 : 0,
                w.isRepetido() ? 1 : 0,
                w.getAgent()
        );
    }
}
