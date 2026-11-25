package com.example.approval.document.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ApprovalPresetRequest(

        @NotBlank(message = "결재선 이름을 입력해주세요.")
        @Size(max = 100)
        String name,

        @NotEmpty(message = "결재자를 선택해주세요.")
        List<@NotNull Long> approverIds

) {
}