package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.DatosRow;

/**
 * Fila que consume el front del tablero "Datos". El canal no viaja acá: la respuesta
 * ({@link DatosBundle}) ya separa las filas por canal y el front lo etiqueta.
 * {@code fecha} en ISO {@code yyyy-MM-dd}; el front deriva mes / día del mes de ahí.
 */
public record DatosDto(String fecha, String semana, String turno, String dia) {
    public static DatosDto from(DatosRow r) {
        return new DatosDto(
                r.getFecha() != null ? r.getFecha().toString() : "",
                r.getSemana(),
                r.getTurno(),
                r.getDia()
        );
    }
}
