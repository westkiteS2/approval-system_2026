import { useEffect, useRef, useState } from 'react'
import { approvalLineApi, approvalPresetApi } from '../api'
import type { Approver, ApprovalPreset } from '../types'
import { MAX_APPROVERS } from '../types'

interface Props {
  writer: {
    name: string
    positionLabel: string
    department: string | null
  }
  approvers: Approver[]
  onChange: (approvers: Approver[]) => void
}

export default function ApprovalLineEditor({
  writer,
  approvers,
  onChange,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Approver[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  // 개인 결재선 관리
  const [presets, setPresets] = useState<ApprovalPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [presetName, setPresetName] = useState('')
  const [presetError, setPresetError] = useState('')
  const [presetMessage, setPresetMessage] = useState('')
  const [presetBusy, setPresetBusy] = useState(false)

  // 저장된 결재선 목록 조회
  useEffect(() => {
    let cancelled = false

    approvalPresetApi
      .list()
      .then((data) => {
        if (!cancelled) setPresets(data)
      })
      .catch((e: Error) => {
        if (!cancelled) setPresetError(e.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 결재자 검색
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const timer = setTimeout(() => {
      approvalLineApi
        .search(keyword)
        .then((data) => {
          if (!cancelled) setResults(data)
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [keyword, open])

  // 검색창 외부 클릭
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)

    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const selectedIds = new Set(approvers.map((a) => a.id))
  const candidates = results.filter((r) => !selectedIds.has(r.id))
  const full = approvers.length >= MAX_APPROVERS

  const selectedPreset = presets.find((p) => String(p.id) === selectedPresetId)

  // 결재자 추가
  const add = (a: Approver) => {
    if (full || selectedIds.has(a.id)) return

    onChange([...approvers, a])
    setKeyword('')
    setOpen(false)
  }

  // 결재자 삭제
  const remove = (id: number) => {
    onChange(approvers.filter((a) => a.id !== id))
  }

  // 결재 순서 변경
  const move = (index: number, dir: -1 | 1) => {
    const next = [...approvers]
    const target = index + dir

    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]

    onChange(next)
  }

  // 기본 결재선 불러오기
  const loadDefault = async () => {
    setError('')

    try {
      onChange(await approvalLineApi.defaultLine())
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '기본 결재선을 불러오지 못했습니다.',
      )
    }
  }

  const clearPresetFeedback = () => {
    setPresetError('')
    setPresetMessage('')
  }

  // 현재 결재선 저장
  const savePreset = async () => {
    clearPresetFeedback()

    const name = presetName.trim()

    if (!name) {
      setPresetError('결재선 이름을 입력해주세요.')
      return
    }

    if (approvers.length === 0 || approvers.length > MAX_APPROVERS) {
      setPresetError(`결재자를 1~${MAX_APPROVERS}명 선택해주세요.`)
      return
    }

    setPresetBusy(true)

    try {
      const saved = await approvalPresetApi.create({
        name,
        approverIds: approvers.map((a) => a.id),
      })

      setPresets((prev) => [saved, ...prev])
      setSelectedPresetId(String(saved.id))
      setPresetName('')
      setPresetMessage('결재선을 저장했습니다.')
    } catch (e) {
      setPresetError(
        e instanceof Error ? e.message : '결재선 저장에 실패했습니다.',
      )
    } finally {
      setPresetBusy(false)
    }
  }

  // 저장된 결재선 불러오기
  const loadPreset = () => {
    clearPresetFeedback()

    if (!selectedPreset) return

    const ordered = selectedPreset.approverIds.map((id) =>
      selectedPreset.approvers.find((a) => a.id === id),
    )

    if (
      ordered.length === 0 ||
      ordered.length > MAX_APPROVERS ||
      ordered.some((a) => !a) ||
      new Set(selectedPreset.approverIds).size !== ordered.length
    ) {
      setPresetError('저장된 결재선에 유효하지 않은 결재자가 있습니다.')
      return
    }

    if (
      approvers.length > 0 &&
      !window.confirm('현재 결재선을 변경하시겠습니까?')
    ) {
      return
    }

    onChange(ordered.filter((a): a is Approver => !!a))

    setPresetMessage(`${selectedPreset.name}을(를) 불러왔습니다.`)
  }

  // 저장된 결재선 수정
  const updatePreset = async () => {
    clearPresetFeedback()

    if (!selectedPreset) return

    if (approvers.length === 0 || approvers.length > MAX_APPROVERS) {
      setPresetError(`결재자를 1~${MAX_APPROVERS}명 선택해주세요.`)
      return
    }

    const input = window.prompt(
      '결재선 이름을 입력해주세요.',
      selectedPreset.name,
    )

    if (input === null) return

    const name = input.trim()

    if (!name || name.length > 100) {
      setPresetError('이름은 1~100자로 입력해주세요.')
      return
    }

    if (
      !window.confirm('선택한 결재선을 현재 결재자 목록으로 수정하시겠습니까?')
    ) {
      return
    }

    setPresetBusy(true)

    try {
      const updated = await approvalPresetApi.update(selectedPreset.id, {
        name,
        approverIds: approvers.map((a) => a.id),
      })

      setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

      setPresetMessage('결재선을 수정했습니다.')
    } catch (e) {
      setPresetError(
        e instanceof Error ? e.message : '결재선 수정에 실패했습니다.',
      )
    } finally {
      setPresetBusy(false)
    }
  }

  // 저장된 결재선 삭제
  const deletePreset = async () => {
    clearPresetFeedback()

    if (!selectedPreset) return

    if (
      !window.confirm(`"${selectedPreset.name}" 결재선을 삭제하시겠습니까?`)
    ) {
      return
    }

    setPresetBusy(true)

    try {
      await approvalPresetApi.remove(selectedPreset.id)

      setPresets((prev) => prev.filter((p) => p.id !== selectedPreset.id))

      setSelectedPresetId('')
      setPresetMessage('결재선을 삭제했습니다.')
    } catch (e) {
      setPresetError(
        e instanceof Error ? e.message : '결재선 삭제에 실패했습니다.',
      )
    } finally {
      setPresetBusy(false)
    }
  }

  return (
    <div className="apv-line-editor">
      {/* 저장된 결재선 관리 */}
      <div className="apv-preset-panel">
        <strong>저장된 결재선</strong>

        <div className="apv-preset-row">
          <select
            aria-label="저장된 결재선"
            value={selectedPresetId}
            disabled={presetBusy}
            onChange={(e) => {
              setSelectedPresetId(e.target.value)
              clearPresetFeedback()
            }}
          >
            <option value="">결재선을 선택하세요</option>

            {presets.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="apv-btn apv-btn--ghost"
            disabled={!selectedPreset || presetBusy}
            onClick={loadPreset}
          >
            불러오기
          </button>

          <button
            type="button"
            className="apv-btn apv-btn--ghost"
            disabled={!selectedPreset || presetBusy}
            onClick={updatePreset}
          >
            수정
          </button>

          <button
            type="button"
            className="apv-btn apv-btn--ghost apv-danger-text"
            disabled={!selectedPreset || presetBusy}
            onClick={deletePreset}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 기존 결재선 표시 */}
      <ol className="apv-line-flow">
        <li className="apv-line-node apv-line-node--writer">
          <span className="apv-line-step">기안</span>
          <strong>{writer.name}</strong>
          <small>
            {writer.department} · {writer.positionLabel}
          </small>
        </li>

        {approvers.map((a, i) => (
          <li key={a.id} className="apv-line-node">
            <span className="apv-line-step">{i + 1}차 결재</span>

            <strong>{a.name}</strong>

            <small>
              {a.department} · {a.positionLabel}
            </small>

            <div className="apv-line-actions">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="앞으로"
              >
                ◀
              </button>

              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === approvers.length - 1}
                aria-label="뒤로"
              >
                ▶
              </button>

              <button
                type="button"
                className="apv-danger-text"
                onClick={() => remove(a.id)}
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          </li>
        ))}

        {approvers.length === 0 && (
          <li className="apv-line-empty">결재자를 추가하세요</li>
        )}
      </ol>

      {/* 기존 결재자 검색 */}
      <div className="apv-line-tools">
        <div className="apv-search" ref={boxRef}>
          <input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              full
                ? `결재자는 최대 ${MAX_APPROVERS}명입니다`
                : '이름 또는 부서로 결재자 검색'
            }
            disabled={full}
          />

          {open && !full && (
            <ul className="apv-search-results">
              {candidates.length === 0 ? (
                <li className="apv-search-empty">검색 결과가 없습니다</li>
              ) : (
                candidates.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => add(c)}>
                      <strong>{c.name}</strong>
                      <span>
                        {c.department} · {c.positionLabel}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="apv-btn apv-btn--ghost"
          onClick={loadDefault}
        >
          기본 결재선
        </button>
      </div>

      {/* 현재 결재선 저장 */}
      <div className="apv-preset-panel">
        <strong>현재 결재선 저장</strong>

        <div className="apv-preset-row">
          <input
            aria-label="결재선 이름"
            value={presetName}
            maxLength={100}
            disabled={presetBusy}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="예: 일반 업무 결재선"
          />

          <button
            type="button"
            className="apv-btn apv-btn--ghost"
            disabled={
              presetBusy || !presetName.trim() || approvers.length === 0
            }
            onClick={savePreset}
          >
            {presetBusy ? '처리 중...' : '결재선 저장'}
          </button>
        </div>
      </div>

      {error && <p className="apv-field-error">{error}</p>}

      {presetError && (
        <p className="apv-field-error" role="alert">
          {presetError}
        </p>
      )}

      {presetMessage && (
        <p className="apv-preset-success" role="status">
          {presetMessage}
        </p>
      )}
    </div>
  )
}
