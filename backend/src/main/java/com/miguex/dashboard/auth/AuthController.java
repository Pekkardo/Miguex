package com.miguex.dashboard.auth;

import com.miguex.dashboard.model.User;
import com.miguex.dashboard.repo.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/** Login / logout / sesión actual. El JWT nunca se devuelve en el body: va en cookie httpOnly. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final boolean cookieSecure;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                          @Value("${jwt.cookie-secure:false}") boolean cookieSecure) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.cookieSecure = cookieSecure;
    }

    public record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body) {
        Optional<User> found = users.findByUsername(
                body.username() == null ? "" : body.username().trim());

        // Mismo mensaje para usuario inexistente y contraseña incorrecta: no filtrar
        // qué usuarios existen.
        if (found.isEmpty() || !encoder.matches(body.password(), found.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario o contraseña incorrectos."));
        }

        User u = found.get();
        String token = jwt.generate(u.getUsername(), u.getRole().name());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(token, jwt.ttl()).toString())
                .body(Map.of("username", u.getUsername(), "role", u.getRole().name()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(Map.of("ok", true));
    }

    /** Sesión actual. Lo usa el guard de Angular para saber si hay que ir al login. */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado."));
        }
        String role = auth.getAuthorities().stream().findFirst()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .orElse("VIEWER");
        return ResponseEntity.ok(Map.of("username", auth.getName(), "role", role));
    }

    /**
     * secure=false por defecto porque hoy el tablero se sirve por HTTP en :8686 y una
     * cookie Secure sería descartada por el browser (login roto, sin error visible).
     * Poner JWT_COOKIE_SECURE=true cuando haya TLS.
     */
    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(JwtCookieFilter.COOKIE_NAME, value)
                .httpOnly(true)
                .sameSite("Strict")
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
