package com.miguex.dashboard.dto;

import java.util.List;

/**
 * Respuesta de {@code GET /api/datos/data}: las 3 fuentes en una sola ida, cada una
 * en su lista. El front las aplana a un modelo único etiquetando el canal.
 */
public record DatosBundle(
        List<DatosDto> c0800,
        List<DatosDto> leads,
        List<DatosDto> chats
) {}
