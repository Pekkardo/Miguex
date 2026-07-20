package com.miguex.dashboard.auth;

import com.miguex.dashboard.model.User;
import com.miguex.dashboard.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el usuario admin inicial al arrancar. Idempotente: si ya existe no lo toca
 * (para no pisar una contraseña rotada a mano). Si ADMIN_PASSWORD viene vacía no
 * crea nada — mejor quedarse sin admin que dejar uno con contraseña conocida.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String username;
    private final String password;

    public AdminSeeder(UserRepository users, PasswordEncoder encoder,
                       @Value("${admin.username:admin}") String username,
                       @Value("${admin.password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (password == null || password.isBlank()) {
            log.warn("ADMIN_PASSWORD no definida: no se creó el usuario admin. "
                   + "Definila y reiniciá para poder entrar al tablero.");
            return;
        }
        if (users.findByUsername(username).isPresent()) {
            log.info("El usuario admin '{}' ya existe: no se modifica.", username);
            return;
        }
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(User.Role.ADMIN);
        users.save(u);
        log.info("Usuario admin '{}' creado.", username);
    }
}
