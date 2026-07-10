package com.miguex.dashboard.cruce.model;

import jakarta.persistence.*;

/**
 * Fila de Ventas / Matrículas (Excel con columnas Neotel, Dia, Mes, Semana, Nombre de carrera).
 * Cada fila es una matrícula; se cuentan por vendedor cruzando {@link #neotel} contra la nómina.
 * Vive en la BBDD aparte del cruce ({@code cruce}), aislada del tablero principal.
 */
@Entity
@Table(name = "cruce_ventas", indexes = {
        @Index(name = "idx_cruce_ventas_neotel", columnList = "neotel")
})
public class VentaMatricula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Código Neotel del vendedor que hizo la venta; se cruza contra la "U" de la nómina. */
    @Column(length = 60)
    private String neotel;

    @Column(length = 60)
    private String mes;

    @Column(length = 60)
    private String semana;

    @Column(length = 60)
    private String dia;

    @Column(length = 500)
    private String carrera;

    public VentaMatricula() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNeotel() { return neotel; }
    public void setNeotel(String neotel) { this.neotel = neotel; }

    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }

    public String getSemana() { return semana; }
    public void setSemana(String semana) { this.semana = semana; }

    public String getDia() { return dia; }
    public void setDia(String dia) { this.dia = dia; }

    public String getCarrera() { return carrera; }
    public void setCarrera(String carrera) { this.carrera = carrera; }
}
