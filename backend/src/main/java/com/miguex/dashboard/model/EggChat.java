package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Un chat de WhatsApp del tablero de Admisiones (Egg), ya parseado desde la
 * hoja "Info" del Excel "Aux REPORTE EJECUTIVO WP". Cada campo replica la clave
 * que el HTML espera por fila en su array RAW_DATA.
 */
@Entity
@Table(name = "egg_chat", indexes = {
        @Index(name = "idx_egg_fecha", columnList = "fecha"),
        @Index(name = "idx_egg_res", columnList = "resolucionV2"),
        @Index(name = "idx_egg_sal", columnList = "salientes")
})
public class EggChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Fecha del chat (campo "Fecha real"). */
    private LocalDate fecha;

    /** Día del mes (campo "Dia"). */
    private Integer dia;

    /** Mes (campo "Mes"). */
    private Integer mes;

    /** Teléfono del contacto (campo "Telefono"). */
    private Long telefono;

    /** "Único" / "Duplicado" (campo "Repetidos"). */
    @Column(length = 20)
    private String repetidos;

    /** Tipificación (campo "Resolucion V2"). */
    @Column(length = 200)
    private String resolucionV2;

    /** "SI" / "NO" (campo "salientes"). */
    @Column(length = 5)
    private String salientes;

    /** Estado del chat: "open" / "close" (campo "Estado"). */
    @Column(length = 30)
    private String estado;

    /** Canal (campo "Canal"). */
    @Column(length = 40)
    private String canal;

    /** Usuario/agente (campo "Usuario"). */
    @Column(length = 160)
    private String usuario;

    /** Campaña (campo "Campaña"). */
    @Column(length = 160)
    private String campana;

    /** Subcategoría (campo "SubCategoria"). */
    @Column(length = 200)
    private String subCategoria;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

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
