
package com.example.approval.document.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "approval_presets")
public class ApprovalPreset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @ElementCollection
    @CollectionTable(
        name = "approval_preset_steps",
        joinColumns = @JoinColumn(name = "preset_id")
    )
    @OrderColumn(name = "step_order")
    @Column(name = "approver_id", nullable = false)
    private List<Long> approverIds = new ArrayList<>();

    protected ApprovalPreset() {
    }

    public ApprovalPreset(
            String name,
            Long ownerId,
            List<Long> approverIds) {

        this.name = name;
        this.ownerId = ownerId;
        this.approverIds = new ArrayList<>(approverIds);
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public List<Long> getApproverIds() {
        return approverIds;
    }

    public void setApproverIds(List<Long> approverIds) {
        this.approverIds.clear();
        this.approverIds.addAll(approverIds);
    }
}
