package com.miguex.dashboard.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtCookieFilter jwtCookieFilter;

    public SecurityConfig(JwtCookieFilter jwtCookieFilter) {
        this.jwtCookieFilter = jwtCookieFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Sólo protege /api/**: nginx resuelve las rutas de la SPA (/, /wad, /egg, /cruce)
     * con try_files y únicamente proxea /api/ al backend, así que el fallback del
     * front nunca pasa por acá. El securityMatcher además evita interceptar cualquier
     * otra cosa si alguien pega directo al backend en :8080.
     *
     * CSRF deshabilitado a propósito: el token viaja en una cookie SameSite=Strict, que
     * es justamente lo que corta el vector CSRF (el browser no la adjunta en peticiones
     * originadas por otro sitio), y el único cliente es la SPA del mismo origen.
     * Si algún día se relaja a SameSite=Lax o entra un cliente cross-origin,
     * HAY QUE REACTIVAR CSRF acá.
     */
    @Bean
    public SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/health", "/api/*/health").permitAll()
                // Escrituras: sólo ADMIN. Los VIEWER quedan en sólo lectura.
                .requestMatchers(HttpMethod.POST, "/api/upload", "/api/*/upload").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            // 401 pelado en vez del redirect 302 al form login por defecto, que el
            // interceptor de Angular no sabría interpretar.
            .exceptionHandling(e -> e.authenticationEntryPoint(
                (req, res, ex) -> res.setStatus(401)))
            .addFilterBefore(jwtCookieFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
