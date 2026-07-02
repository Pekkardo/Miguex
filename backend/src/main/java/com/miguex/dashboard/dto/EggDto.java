package com.miguex.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.miguex.dashboard.model.EggChat;

/**
 * Fila tal cual la consume el HTML del tablero de Admisiones (Egg):
 * mismas claves (con espacios y acentos) que el array RAW_DATA original.
 */
public record EggDto(
        @JsonProperty("Fecha real") String fechaReal,
        @JsonProperty("Dia") Integer dia,
        @JsonProperty("Mes") Integer mes,
        @JsonProperty("Telefono") Long telefono,
        @JsonProperty("Repetidos") String repetidos,
        @JsonProperty("Resolucion V2") String resolucionV2,
        @JsonProperty("salientes") String salientes,
        @JsonProperty("Estado") String estado,
        @JsonProperty("Canal") String canal,
        @JsonProperty("Usuario") String usuario,
        @JsonProperty("Campaña") String campana,
        @JsonProperty("SubCategoria") String subCategoria
) {
    public static EggDto from(EggChat e) {
        return new EggDto(
                e.getFecha() != null ? e.getFecha().toString() : "",
                e.getDia(),
                e.getMes(),
                e.getTelefono(),
                e.getRepetidos(),
                e.getResolucionV2(),
                e.getSalientes(),
                e.getEstado(),
                e.getCanal(),
                e.getUsuario(),
                e.getCampana(),
                e.getSubCategoria()
        );
    }
}
