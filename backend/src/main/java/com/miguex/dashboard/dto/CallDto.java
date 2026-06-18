package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.CallRecord;

/**
 * Fila tal cual la consume el front-end (mismas claves que el objeto "enriched").
 */
public record CallDto(
        boolean conn,
        Integer h,
        String dateKey,
        Integer dow,
        boolean mat,
        String agent,
        Integer dur,
        String tipo
) {
    public static CallDto from(CallRecord r) {
        return new CallDto(
                r.isConectada(),
                r.getHora(),
                r.getFecha() != null ? r.getFecha().toString() : "",
                r.getDow(),
                r.isMatriculado(),
                r.getAgent(),
                r.getDuracion(),
                r.getTipo()
        );
    }
}
