package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.WadChat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WadChatRepository extends JpaRepository<WadChat, Long> {
}
