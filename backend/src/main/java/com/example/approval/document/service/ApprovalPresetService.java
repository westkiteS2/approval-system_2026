
package com.example.approval.document.service;

import com.example.approval.document.domain.ApprovalPreset;
import com.example.approval.document.dto.ApprovalPresetRequest;
import com.example.approval.document.dto.ApprovalPresetResponse;
import com.example.approval.document.dto.ApproverResponse;
import com.example.approval.document.repository.ApprovalPresetRepository;
import com.example.approval.domain.User;
import com.example.approval.domain.UserStatus;
import com.example.approval.exception.ApiException;
import com.example.approval.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class ApprovalPresetService {

    private final ApprovalPresetRepository presetRepository;
    private final UserRepository userRepository;

    public ApprovalPresetService(
            ApprovalPresetRepository presetRepository,
            UserRepository userRepository) {

        this.presetRepository = presetRepository;
        this.userRepository = userRepository;
    }

    // 내 결재선 목록 조회
    public List<ApprovalPresetResponse> findAll(String loginId) {
        User owner = currentUser(loginId);

        return presetRepository
                .findAllByOwnerIdOrderByIdDesc(owner.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 결재선 저장
    @Transactional
    public ApprovalPresetResponse create(
            String loginId,
            ApprovalPresetRequest request) {

        User owner = currentUser(loginId);
        String name = request.name().strip();

        if (presetRepository.existsByOwnerIdAndName(
                owner.getId(), name)) {

            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "이미 같은 이름의 결재선이 있습니다.");
        }

        validateApprovers(owner, request.approverIds());

        ApprovalPreset preset = new ApprovalPreset(
                name,
                owner.getId(),
                request.approverIds()
        );

        return toResponse(presetRepository.save(preset));
    }

    // 결재선 수정
    @Transactional
    public ApprovalPresetResponse update(
            String loginId,
            Long id,
            ApprovalPresetRequest request) {

        User owner = currentUser(loginId);
        ApprovalPreset preset = findOwnedPreset(id, owner.getId());

        String name = request.name().strip();

        if (!preset.getName().equals(name)
                && presetRepository.existsByOwnerIdAndName(
                        owner.getId(), name)) {

            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "이미 같은 이름의 결재선이 있습니다.");
        }

        validateApprovers(owner, request.approverIds());

        preset.setName(name);
        preset.setApproverIds(request.approverIds());

        return toResponse(presetRepository.save(preset));
    }

    // 결재선 삭제
    @Transactional
    public void delete(String loginId, Long id) {
        User owner = currentUser(loginId);
        ApprovalPreset preset = findOwnedPreset(id, owner.getId());

        presetRepository.delete(preset);
    }

    // 로그인 사용자 확인
    private User currentUser(String loginId) {
        User user = userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "로그인이 필요합니다."));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "활성화된 사용자만 이용할 수 있습니다.");
        }

        return user;
    }

    // 결재선 소유권 확인
    private ApprovalPreset findOwnedPreset(
            Long id, Long ownerId) {

        return presetRepository
                .findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "결재선을 찾을 수 없습니다."));
    }

    // 결재자 유효성 검사
    private void validateApprovers(
            User owner, List<Long> approverIds) {

        if (approverIds == null || approverIds.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "결재자를 선택해주세요.");
        }

        Set<Long> uniqueIds = new HashSet<>(approverIds);

        if (uniqueIds.size() != approverIds.size()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "중복된 결재자가 있습니다.");
        }

        if (uniqueIds.contains(owner.getId())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "본인을 결재자로 지정할 수 없습니다.");
        }

        Set<Long> validIds = new HashSet<>();

        userRepository
                .findAllByStatusOrderByCreatedAtAsc(UserStatus.ACTIVE)
                .stream()
                .filter(User::isEmployee)
                .forEach(user -> validIds.add(user.getId()));

        if (!validIds.containsAll(approverIds)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "유효하지 않은 결재자가 포함되어 있습니다.");
        }
    }

    // Entity를 Response DTO로 변환
    private ApprovalPresetResponse toResponse(
            ApprovalPreset preset) {

        List<Long> ids = new ArrayList<>(preset.getApproverIds());

        Map<Long, User> userMap = new HashMap<>();

        userRepository.findAllById(ids)
                .forEach(user -> userMap.put(user.getId(), user));

        List<ApproverResponse> approvers = ids.stream()
                .map(userMap::get)
                .filter(Objects::nonNull)
                .map(ApproverResponse::from)
                .toList();

        return new ApprovalPresetResponse(
                preset.getId(),
                preset.getName(),
                ids,
                approvers
        );
    }
}
