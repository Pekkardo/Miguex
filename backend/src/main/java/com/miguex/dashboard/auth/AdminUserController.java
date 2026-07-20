package com.miguex.dashboard.auth;

import com.miguex.dashboard.dto.UserDto;
import com.miguex.dashboard.model.User;
import com.miguex.dashboard.repo.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Alta, listado y borrado de usuarios. Todo bajo /api/admin/** (sólo ADMIN, ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AdminUserController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public record CreateUserRequest(String username, String password, String role) {}

    @GetMapping
    public List<UserDto> list() {
        return users.findAllByOrderByUsernameAsc().stream().map(UserDto::from).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateUserRequest body) {
        String username = body.username() == null ? "" : body.username().trim();
        String password = body.password() == null ? "" : body.password();

        if (username.length() < 3 || username.length() > 64) {
            return ResponseEntity.badRequest().body(Map.of("error", "El usuario debe tener entre 3 y 64 caracteres."));
        }
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "La contraseña debe tener al menos 6 caracteres."));
        }
        User.Role role;
        try {
            role = User.Role.valueOf(body.role() == null ? "" : body.role().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rol inválido: debe ser ADMIN o VIEWER."));
        }
        if (users.findByUsername(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Ya existe un usuario con ese nombre."));
        }

        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(role);
        users.save(u);

        return ResponseEntity.status(201).body(UserDto.from(u));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Optional<User> found = users.findById(id);
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado."));
        }
        User target = found.get();

        if (target.getUsername().equals(auth.getName())) {
            return ResponseEntity.badRequest().body(Map.of("error", "No podés borrar tu propio usuario."));
        }
        if (target.getRole() == User.Role.ADMIN && users.countByRole(User.Role.ADMIN) <= 1) {
            return ResponseEntity.status(409).body(Map.of("error", "No se puede borrar el último administrador."));
        }

        users.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
