package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.Matricula;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatriculaRepository extends JpaRepository<Matricula, Long> {
}
