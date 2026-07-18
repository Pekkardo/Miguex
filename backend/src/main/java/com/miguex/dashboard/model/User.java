package com.miguex.dashboard.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Usuario del tablero. Vive en este paquete (y no en uno propio de auth) porque
 * {@link com.miguex.dashboard.config.MainDbConfig} escanea las entidades con
 * {@code .packages("com.miguex.dashboard.model")} hardcodeado: fuera de acá,
 * Hibernate no crearía la tabla y el fallo recién se notaría al primer login.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String username;

    /** Hash BCrypt (60 caracteres). Nunca la contraseña en claro. */
    @Column(nullable = false, length = 72)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role = Role.VIEWER;

    private Instant createdAt = Instant.now();

    /** ADMIN puede subir Excels y borrar datos; VIEWER sólo lee los tableros. */
    public enum Role { ADMIN, VIEWER }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
