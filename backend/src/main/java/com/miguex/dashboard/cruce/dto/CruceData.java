package com.miguex.dashboard.cruce.dto;

import java.util.List;

/**
 * Snapshot de lo guardado en la BBDD del cruce, tal como lo consume el front para armar la tabla.
 * Las claves de cada fila replican los nombres que usa el front del cruce en el navegador.
 */
public record CruceData(List<Nomina> nomina, List<Venta> ventas) {

    public record Nomina(String u, String vendedor, String lider, String campania, String estado) {
    }

    public record Venta(String neotel, String mes, String semana, String dia, String carrera) {
    }
}
