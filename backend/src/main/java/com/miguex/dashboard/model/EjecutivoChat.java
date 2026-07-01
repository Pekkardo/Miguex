package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Un chat de WhatsApp del reporte "Ejecutivo" (hoja de detalle con tipificaciones
 * completas: Resolución V2, SubCategoría, Campaña, etc.). Una fila = una fila del Excel.
 */
@Entity
@Table(name = "ejecutivo_chat", indexes = {
        @Index(name = "idx_ejecutivo_fecha", columnList = "fechaReal"),
        @Index(name = "idx_ejecutivo_mes", columnList = "mes"),
        @Index(name = "idx_ejecutivo_dia", columnList = "dia"),
        @Index(name = "idx_ejecutivo_resolucion", columnList = "resolucionV2")
})
public class EjecutivoChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fechaReal;   // "Fecha real"
    private Integer dia;           // "Dia"
    private Integer mes;           // "Mes"
    private Long telefono;         // "Telefono"
    @Column(length = 20)
    private String repetidos;      // "Repetidos" (Único / Duplicado)
    @Column(length = 200)
    private String resolucionV2;   // "Resolucion V2"
    @Column(length = 5)
    private String salientes;      // "salientes" (SI / NO)
    @Column(length = 20)
    private String estado;         // "Estado"
    @Column(length = 40)
    private String canal;          // "Canal"
    @Column(length = 160)
    private String usuario;        // "Usuario"
    @Column(length = 200)
    private String campana;        // "Campaña"
    @Column(length = 200)
    private String subCategoria;   // "SubCategoria"

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getFechaReal() { return fechaReal; }
    public void setFechaReal(LocalDate fechaReal) { this.fechaReal = fechaReal; }

    public Integer getDia() { return dia; }
    public void setDia(Integer dia) { this.dia = dia; }

    public Integer getMes() { return mes; }
    public void setMes(Integer mes) { this.mes = mes; }

    public Long getTelefono() { return telefono; }
    public void setTelefono(Long telefono) { this.telefono = telefono; }

    public String getRepetidos() { return repetidos; }
    public void setRepetidos(String repetidos) { this.repetidos = repetidos; }

    public String getResolucionV2() { return resolucionV2; }
    public void setResolucionV2(String resolucionV2) { this.resolucionV2 = resolucionV2; }

    public String getSalientes() { return salientes; }
    public void setSalientes(String salientes) { this.salientes = salientes; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }

    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }

    public String getCampana() { return campana; }
    public void setCampana(String campana) { this.campana = campana; }

    public String getSubCategoria() { return subCategoria; }
    public void setSubCategoria(String subCategoria) { this.subCategoria = subCategoria; }
}
