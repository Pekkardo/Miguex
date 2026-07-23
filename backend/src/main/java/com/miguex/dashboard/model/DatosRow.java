package com.miguex.dashboard.model;

import java.time.LocalDate;

/**
 * Contrato común de las 3 tablas del tablero "Datos" (0800, Leads, Chats). Las tres
 * fuentes se normalizan a las mismas 4 columnas de negocio; el canal lo aporta cada
 * tabla/entidad. Permite un único {@link com.miguex.dashboard.dto.DatosDto#from} para
 * las tres sin duplicar el mapeo.
 */
public interface DatosRow {
    LocalDate getFecha();
    String getSemana();
    String getTurno();
    String getDia();
}
