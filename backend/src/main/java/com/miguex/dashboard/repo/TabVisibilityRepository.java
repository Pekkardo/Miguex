package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.TabVisibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TabVisibilityRepository extends JpaRepository<TabVisibility, Long> {
    Optional<TabVisibility> findByTabKey(String tabKey);
}
