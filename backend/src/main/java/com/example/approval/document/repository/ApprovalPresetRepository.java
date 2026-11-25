
package com.example.approval.document.repository;

import com.example.approval.document.domain.ApprovalPreset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalPresetRepository
        extends JpaRepository<ApprovalPreset, Long> {

    List<ApprovalPreset> findAllByOwnerIdOrderByIdDesc(
            Long ownerId);

    Optional<ApprovalPreset> findByIdAndOwnerId(
            Long id, Long ownerId);

    boolean existsByOwnerIdAndName(
            Long ownerId, String name);
}
