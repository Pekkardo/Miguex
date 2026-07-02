package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.EggChat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EggChatRepository extends JpaRepository<EggChat, Long> {
}
