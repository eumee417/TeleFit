"""
AgentState

"""

from __future__ import annotations

from typing import Literal, TypedDict


class CandidateResult(TypedDict):
    """Retriever가 조회한 후보 1개 + 그 후보에 대한 계산/검증 결과."""

    candidate_id: str  # Retriever가 부여 (예: plan_id 또는 plan_id+combine_product_id 조합)
    plan: dict
    combine_product: dict | None
    handset: dict | None

    calculation_result: dict | None  # Calculator 결과 (get_combine_discount/compare_device_subsidy 종합)
    validation_result: dict | None  # Grader 결과 (조건 위배 여부 + 근거가 된 combine_rules row)
    status: Literal["PENDING", "VALID", "FALLBACK"]  # FALLBACK = 상한 초과로 근사치 확정


class AgentState(TypedDict):
    # Router
    parsed_requirements: dict
    # PII 마스킹 이후 메시지만 보관 (원문 텍스트/캡쳐화면은 저장 안 함 — 절대 원칙)
    messages: list[dict]

    # Retriever
    context: str  # 정형+벡터 검색 결과를 합친 컨텍스트 (Calculator 프롬프트에 주입)
    candidates: list[CandidateResult]  # 원래 candidate_plan(dict) -> list(3개)로 변경

    # Calculator <-> Grader self-correction 루프
    retry_count: int  # 배치(candidates 전체) 기준 상한 3회
    tried_combinations: list[dict]  # 재계산 시도했던 실패 조합 기록 (Calculator가 같은 실수 반복 방지용 참조)

    # Output
    final_output: dict | None  # 카드 3장으로 정리된 최종 응답