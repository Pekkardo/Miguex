package com.miguex.dashboard.dto;

import com.miguex.dashboard.model.User;

import java.time.Instant;

/** Nunca incluye passwordHash. */
public record UserDto(Long id, String username, String role, Instant createdAt) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getUsername(), u.getRole().name(), u.getCreatedAt());
    }
}
