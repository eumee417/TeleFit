"""
Grader Node

candidates 중 status="PENDING"이고 calculation_result가 있는 것들을
combine_rules(rule_type='ELIGIBILITY')로 검증한다.
DB는 안 건드림 — Retriever가 combine_product['rules']에 미리 실어준 걸 씀
(절대 원칙: DB 접근은 Retriever로만).

판정:
  - 위배 규칙 없음 -> status="VALID"
  - 위배 있음 또는 계산 자체가 안 됨 -> status는 PENDING 유지 (route_after_grader가
    Calculator로 되돌려서 재계산시킴)
  - 이번 판정에서도 실패가 하나라도 남으면 retry_count += 1 (candidates 배치 전체 기준).
    retry_count가 MAX_RETRY(3)에 도달하면 남은 PENDING을 전부 FALLBACK으로 확정.

TODO: rule_type='DEVICE_BENEFIT' 규칙은 아직 어디서도 적용 안 함 — Calculator의
계산에 반영할지, 여기서 부가 혜택으로만 표시할지 결정 필요 (실제 combine_rules
시드 데이터 보면서 정하는 게 나을 듯).

condition_field는 실제 combine_rules 시드 기준으로 두 종류가 확인됨:
  - plan_base_fee: plan 필드(monthly_fee)의 DB 컬럼명 별칭. _build_context()에서 채움.
  - same_owner_line_count: 사용자 요구사항 쪽 필드. Router가 항상 물어봐서
    parsed_requirements에 채워 넣음(router.py의 ParsedRequirements 참고).
"""

from __future__ import annotations

from typing import Any

from agent.core.constants import MAX_RETRY
from agent.core.state import AgentState, CandidateResult

_OPERATORS = {
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: a == b,
    "=": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
}


def _coerce(value_str: str, reference: Any):
    if isinstance(reference, bool):
        return value_str.strip().lower() in ("true", "1", "yes")
    if isinstance(reference, int):
        return int(value_str)
    if isinstance(reference, float):
        return float(value_str)
    return value_str


def _build_context(candidate: CandidateResult, parsed_requirements: dict) -> dict:
    """condition_field를 찾을 대상 dict. plan 필드가 요구사항 필드보다 우선.

    combine_rules.condition_field는 schema_full.sql 컬럼명(plan_base_fee)을 그대로 쓰는데,
    Retriever가 plan 필드는 monthly_fee로 이름을 바꿔서 넘기므로(base_fee -> monthly_fee)
    여기서 별칭을 하나 채워준다. plan_base_fee 자체가 parsed_requirements/plan에 실제로
    있을 리는 없으니 merge 순서와 무관하게 안전함.
    """
    plan = candidate["plan"]
    context = {**parsed_requirements, **plan}
    context["plan_base_fee"] = plan.get("monthly_fee")
    return context


def _evaluate_rule(rule: dict, context: dict) -> bool:
    field = rule["condition_field"]
    if field not in context:
        # 검증에 필요한 필드를 못 찾으면 보수적으로 "위배"로 처리 (통과시키지 않음)
        return False
    actual = context[field]
    op = _OPERATORS.get(rule["condition_operator"])
    if op is None:
        return False
    expected = _coerce(rule["condition_value"], actual)
    return op(actual, expected)


async def grader_node(state: AgentState) -> dict:
    candidates = state.get("candidates", [])
    parsed_requirements = state.get("parsed_requirements", {})
    retry_count = state.get("retry_count", 0)

    still_has_failure = False
    updated: list[CandidateResult] = []

    for c in candidates:
        if c["status"] != "PENDING":
            updated.append(c)
            continue

        if c.get("calculation_result") is None:
            # Calculator가 이 후보를 아직 계산 안 함 -> PENDING 유지, 재시도 대상
            updated.append(c)
            still_has_failure = True
            continue

        combine = c.get("combine_product") or {}
        rules = combine.get("rules", [])
        eligibility_rules = [r for r in rules if r.get("rule_type") == "ELIGIBILITY"]

        context = _build_context(c, parsed_requirements)
        violated = [r for r in eligibility_rules if not _evaluate_rule(r, context)]

        new_c: CandidateResult = dict(c)  # type: ignore[assignment]
        if violated:
            new_c["validation_result"] = {
                "passed": False,
                "violated_rules": [r["effect_description"] for r in violated],
            }
            still_has_failure = True
            # status는 PENDING 유지 (재계산 대상)
        else:
            new_c["validation_result"] = {"passed": True, "violated_rules": []}
            new_c["status"] = "VALID"
        updated.append(new_c)

    new_retry_count = retry_count + (1 if still_has_failure else 0)

    if still_has_failure and new_retry_count >= MAX_RETRY:
        # 상한 도달 -> 남은 PENDING을 근사치(FALLBACK)로 확정하고 진행
        updated = [
            {**c, "status": "FALLBACK"} if c["status"] == "PENDING" else c for c in updated
        ]

    return {"candidates": updated, "retry_count": new_retry_count}