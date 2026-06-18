package com.miguex.dashboard.repo;

import com.miguex.dashboard.model.CallRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallRecordRepository extends JpaRepository<CallRecord, Long> {
}
