package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.EjecutivoChat;

/**
 * Fila tal cual la consume el front-end del reporte "Ejecutivo"
 * (mismas claves abreviadas que el resto de los DTOs del proyecto).
 */
public record EjecutivoDto(
        String dk,    // fechaReal (YYYY-MM-DD)
        Integer dia,
        Integer mes,
        Long tel,     // telefono
        String rep,   // repetidos
        String res,   // resolucionV2
        String sal,   // salientes (SI/NO)
        String est,   // estado
        String can,   // canal
        String usr,   // usuario
        String camp,  // campaña
        String sub    // subCategoria
) {
    public static EjecutivoDto from(EjecutivoChat c) {
        return new EjecutivoDto(
                c.getFechaReal() != null ? c.getFechaReal().toString() : "",
                c.getDia(),
                c.getMes(),
                c.getTelefono(),
                c.getRepetidos(),
                c.getResolucionV2(),
                c.getSalientes(),
                c.getEstado(),
                c.getCanal(),
                c.getUsuario(),
                c.getCampana(),
                c.getSubCategoria()
        );
    }
}
