package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.DatosLeadsRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatosLeadsRepository extends JpaRepository<DatosLeadsRecord, Long> {
}
