package com.miguex.dashboard.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

/**
 * Firma y valida los JWT (HS256) que viajan en la cookie de sesión.
 * El secreto se toma de {@code jwt.secret} (env JWT_SECRET) y la app no arranca
 * si falta o es demasiado corto: un default hardcodeado dejaría el tablero abierto
 * a cualquiera que conozca el repo.
 */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // HS256 exige >= 256 bits

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(@Value("${jwt.secret:}") String secret,
                      @Value("${jwt.ttl-hours:12}") long ttlHours) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET faltante o demasiado corto: se requieren al menos "
                    + MIN_SECRET_BYTES + " bytes (recibidos " + bytes.length + "). "
                    + "Generá uno con: openssl rand -base64 48");
        }
        this.key = new SecretKeySpec(bytes, "HmacSHA256");
        this.ttl = Duration.ofHours(ttlHours);
    }

    public Duration ttl() {
        return ttl;
    }

    public String generate(String username, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttl.toMillis()))
                .signWith(key)
                .compact();
    }

    /** Devuelve los claims si el token es válido y no expiró; null en cualquier otro caso. */
    public Claims parse(String token) {
        try {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null; // token inválido, manipulado o vencido => se trata como anónimo
        }
    }
}
