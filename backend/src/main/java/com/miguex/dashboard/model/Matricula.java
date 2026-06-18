package com.miguex.dashboard.model;

import jakarta.persistence.*;

/**
 * Teléfono presente en la hoja MATRICULAS del Excel.
 */
@Entity
@Table(name = "matricula", indexes = {
        @Index(name = "idx_telefono", columnList = "telefono")
})
public class Matricula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 40)
    private String telefono;

    public Matricula() {
    }

    public Matricula(String telefono) {
        this.telefono = telefono;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
}
