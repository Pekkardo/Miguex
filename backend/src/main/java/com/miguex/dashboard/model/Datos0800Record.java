package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Un contacto 0800 normalizado para el tablero "Datos" (una fila = un contacto).
 * Tabla propia y aislada (el usuario pidió 3 tablas separadas, como wad/egg).
 */
@Entity
@Table(name = "datos_0800", indexes = {
        @Index(name = "idx_datos0800_fecha", columnList = "fecha"),
        @Index(name = "idx_datos0800_semana", columnList = "semana")
})
public class Datos0800Record implements DatosRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fecha;

    @Column(length = 40)
    private String semana;

    @Column(length = 40)
    private String turno;

    @Column(length = 20)
    private String dia;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    @Override public String getSemana() { return semana; }
    public void setSemana(String semana) { this.semana = semana; }

    @Override public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }

    @Override public String getDia() { return dia; }
    public void setDia(String dia) { this.dia = dia; }
}
