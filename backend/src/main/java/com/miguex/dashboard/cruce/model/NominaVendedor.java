package com.miguex.dashboard.cruce.model;

import jakarta.persistence.*;

/**
 * Fila de la Nómina de vendedores (Excel con columnas U, Vendedor, Lider, Campaña).
 * Vive en la BBDD aparte del cruce ({@code cruce}), aislada del tablero principal.
 */
@Entity
@Table(name = "cruce_nomina", indexes = {
        @Index(name = "idx_cruce_nomina_u", columnList = "u")
})
public class NominaVendedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Código "U" del vendedor; es la clave con la que se cruza contra el Neotel de las ventas. */
    @Column(name = "u", length = 60)
    private String u;

    @Column(length = 200)
    private String vendedor;

    @Column(length = 200)
    private String lider;

    @Column(length = 120)
    private String campania;

    public NominaVendedor() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getU() { return u; }
    public void setU(String u) { this.u = u; }

    public String getVendedor() { return vendedor; }
    public void setVendedor(String vendedor) { this.vendedor = vendedor; }

    public String getLider() { return lider; }
    public void setLider(String lider) { this.lider = lider; }

    public String getCampania() { return campania; }
    public void setCampania(String campania) { this.campania = campania; }
}
