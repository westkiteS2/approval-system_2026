
package com.example.approval.document.controller;

import com.example.approval.document.dto.ApprovalPresetRequest;
import com.example.approval.document.dto.ApprovalPresetResponse;
import com.example.approval.document.service.ApprovalPresetService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/approval-line/presets")
public class ApprovalPresetController {

    private final ApprovalPresetService presetService;

    public ApprovalPresetController(
            ApprovalPresetService presetService) {
        this.presetService = presetService;
    }

    // 내 결재선 목록 조회
    @GetMapping
    public List<ApprovalPresetResponse> findAll(
            Authentication auth) {

        return presetService.findAll(auth.getName());
    }

    // 새로운 결재선 저장
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApprovalPresetResponse create(
            Authentication auth,
            @Valid @RequestBody ApprovalPresetRequest request) {

        return presetService.create(
                auth.getName(), request);
    }

    // 저장된 결재선 수정
    @PutMapping("/{id}")
    public ApprovalPresetResponse update(
            Authentication auth,
            @PathVariable Long id,
            @Valid @RequestBody ApprovalPresetRequest request) {

        return presetService.update(
                auth.getName(), id, request);
    }

    // 저장된 결재선 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            Authentication auth,
            @PathVariable Long id) {

        presetService.delete(auth.getName(), id);
    }
}
