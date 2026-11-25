package com.example.approval.document.dto;

import java.util.List;

public record ApprovalPresetResponse(

        Long id,
        String name,
        List<Long> approverIds,
        List<ApproverResponse> approvers

) {
}