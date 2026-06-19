package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Un chat de WhatsApp (WAD) ya parseado desde la hoja "Detalle1" del Excel.
 * Los campos replican lo que el front-end espera por fila.
 */
@Entity
@Table(name = "wad_chat", indexes = {
        @Index(name = "idx_wad_fecha", columnList = "fecha"),
        @Index(name = "idx_wad_agent", columnList = "agent"),
        @Index(name = "idx_wad_estado", columnList = "estadoChat")
})
public class WadChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Fecha del chat (campo "Fecha real"). */
    private LocalDate fecha;

    /** Día de la semana en texto (Lunes, Martes, ...). */
    @Column(length = 20)
    private String dia;

    /** Hora del chat (campo "Hora real"). */
    private Integer hora;

    /** Estado del chat: "Cerrado" / "Abierto". */
    @Column(length = 20)
    private String estadoChat;

    /** Resolución (campo "Resoluciones Real"). */
    @Column(length = 200)
    private String resoluciones;

    /** Si el contacto está matriculado ("Matriculado real" == "Matriculado"). */
    private boolean matriculado;

    /** Agente (parte después de " - " del campo "Usuario"). */
    @Column(length = 160)
    private String agent;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getDia() { return dia; }
    public void setDia(String dia) { this.dia = dia; }

    public Integer getHora() { return hora; }
    public void setHora(Integer hora) { this.hora = hora; }

    public String getEstadoChat() { return estadoChat; }
    public void setEstadoChat(String estadoChat) { this.estadoChat = estadoChat; }

    public String getResoluciones() { return resoluciones; }
    public void setResoluciones(String resoluciones) { this.resoluciones = resoluciones; }

    public boolean isMatriculado() { return matriculado; }
    public void setMatriculado(boolean matriculado) { this.matriculado = matriculado; }

    public String getAgent() { return agent; }
    public void setAgent(String agent) { this.agent = agent; }
}
