package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.DatosChatsRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatosChatsRepository extends JpaRepository<DatosChatsRecord, Long> {
}
