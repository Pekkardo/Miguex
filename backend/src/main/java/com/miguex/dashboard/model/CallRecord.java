package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Una llamada del 0800 ya "enriquecida" (parseada desde el Excel).
 * Los campos replican exactamente lo que el front-end espera por fila.
 */
@Entity
@Table(name = "call_record", indexes = {
        @Index(name = "idx_fecha", columnList = "fecha"),
        @Index(name = "idx_agent", columnList = "agent"),
        @Index(name = "idx_conectada", columnList = "conectada")
})
public class CallRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Si la llamada fue "Conectadas". */
    private boolean conectada;

    /** Hora del campo Inicio (0-23), o null. */
    private Integer hora;

    /** Fecha de la llamada (campo Fecha, formato YYYYMMDD del Excel). */
    private LocalDate fecha;

    /** Día de la semana en convención JS: 0=Dom ... 6=Sáb. */
    private Integer dow;

    /** Si el teléfono figura como matriculado. */
    private boolean matriculado;

    /** Nombre del agente (parte después de " - " del campo Usuario). */
    @Column(length = 160)
    private String agent;

    /** Duración en segundos. */
    private Integer duracion;

    /** Tipo de línea (NAC-CEL, NAC-FIJO, LOC-FIJO, ...). */
    @Column(length = 40)
    private String tipo;

    /** Teléfono de origen (ANI/Teléfono). */
    @Column(length = 40)
    private String ani;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public boolean isConectada() { return conectada; }
    public void setConectada(boolean conectada) { this.conectada = conectada; }

    public Integer getHora() { return hora; }
    public void setHora(Integer hora) { this.hora = hora; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public Integer getDow() { return dow; }
    public void setDow(Integer dow) { this.dow = dow; }

    public boolean isMatriculado() { return matriculado; }
    public void setMatriculado(boolean matriculado) { this.matriculado = matriculado; }

    public String getAgent() { return agent; }
    public void setAgent(String agent) { this.agent = agent; }

    public Integer getDuracion() { return duracion; }
    public void setDuracion(Integer duracion) { this.duracion = duracion; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getAni() { return ani; }
    public void setAni(String ani) { this.ani = ani; }
}
