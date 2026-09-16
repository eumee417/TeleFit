"""
Router Node

역할: 사용자 메시지를 구조화된 요구사항(ParsedRequirements)으로 파싱 + PII 마스킹.
Screenshot Parser(Vision)는 이 노드 앞단의 별도 컴포넌트라서 여기서는 안 다룸 —
이 노드는 이미 텍스트로 들어온 입력만 처리.

무상태 원칙: 정보가 부족하면 needs_clarification=True로 표시하고 final_output에
되묻기 응답을 채워서 그래프를 조기 종료(route_after_router가 END로 보냄).
프론트가 그 응답 + parsed_requirements(prior)를 다음 요청에 다시 실어 보냄 —
그래서 이 노드는 매 호출마다 prior 값을 기반으로 "갱신"하는 방식으로 짬.
"""

from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field

from agent.core.llm import get_llm
from agent.core.state import AgentState

# ---------------------------------------------------------------------------
# PII 마스킹 — 정규식 기반 최소 방어선. 이름/주소 같은 비정형 PII는 못 잡음.
# 더 촘촘하게 가려면 LLM 기반 마스킹으로 보강 필요 (지금은 시간상 정규식만).
# ---------------------------------------------------------------------------

_PHONE_RE = re.compile(r"01[016789]-?\d{3,4}-?\d{4}")
_RRN_RE = re.compile(r"\d{6}-?[1-4]\d{6}")


def _mask_pii(text: str) -> str:
    text = _PHONE_RE.sub("[PHONE]", text)
    text = _RRN_RE.sub("[RRN]", text)
    return text


# ---------------------------------------------------------------------------
# 구조화 출력 스키마
# ---------------------------------------------------------------------------


class ParsedRequirements(BaseModel):
    carrier: Optional[Literal["SKT", "KT", "LGU+"]] = Field(
        default=None, description="사용자가 특정 통신사를 명시했다면 그 값, 아니면 null(3사 비교)"
    )
    data_gb: Optional[int] = Field(
        default=None, description="원하는 최소 월 데이터 제공량(GB). 무제한이면 unlimited_data=true로 표시"
    )
    unlimited_data: bool = Field(default=False, description="무제한 요금제를 원하는지")
    monthly_budget: Optional[int] = Field(default=None, description="월 요금 예산 상한(원). 언급 없으면 null")
    family_line_count: int = Field(default=1, description="결합 대상 회선 수(가족 구성원 수). 언급 없으면 1")
    same_owner_line_count: Optional[int] = Field(
        default=None,
        description=(
            "사용자 본인 명의로 이미 등록되어 있는 휴대폰 회선 수(신규/변경 예정 회선은 제외). "
            "일부 결합상품은 명의당 결합 가능 회선 수를 제한하기 때문에 결합 자격 판정에 필요함."
        ),
    )
    wants_new_device: bool = Field(default=False, description="새 단말기 구매 의향이 있는지")
    handset_model: Optional[str] = Field(
        default=None, description="원하는 단말기 기종명(예: 갤럭시 S26). wants_new_device=true인데 언급 없으면 null"
    )
    subscription_type: Optional[Literal["UPGRADE", "MNP"]] = Field(
        default=None, description="기기변경(UPGRADE) 또는 번호이동(MNP). wants_new_device=true일 때만 의미 있음"
    )


_MISSING_FIELD_LABELS = {
    "same_owner_line_count": "본인 명의로 이미 등록된 휴대폰 회선 수",
    "handset_model": "원하시는 단말기 기종",
    "subscription_type": "기기변경인지 번호이동인지",
}


def _find_missing_fields(parsed: dict) -> list[str]:
    # same_owner_line_count는 결합 자격(예: SKT 요즘가족결합의 "명의당 1회선" 제한)
    # 판정에 항상 쓰일 수 있어서 wants_new_device 여부와 무관하게 매번 확인한다.
    missing = []
    if parsed.get("same_owner_line_count") is None:
        missing.append("same_owner_line_count")

    if not parsed.get("wants_new_device"):
        return missing
    if not parsed.get("handset_model"):
        missing.append("handset_model")
    if not parsed.get("subscription_type"):
        missing.append("subscription_type")
    return missing


def _build_clarification_message(missing: list[str]) -> str:
    labels = [_MISSING_FIELD_LABELS.get(f, f) for f in missing]
    return "추천을 위해 " + ", ".join(labels) + " 정보가 더 필요해요."


# ---------------------------------------------------------------------------
# 노드 진입점
# ---------------------------------------------------------------------------


async def router_node(state: AgentState) -> dict:
    raw_messages = state.get("messages", [])
    masked_messages = [
        {**m, "content": _mask_pii(m["content"])} if isinstance(m.get("content"), str) else m
        for m in raw_messages
    ]

    prior = state.get("parsed_requirements") or {}
    llm = get_llm()
    structured_llm = llm.with_structured_output(ParsedRequirements)

    system_prompt = {
        "role": "system",
        "content": (
            "사용자의 통신 요금제/결합상품 요구사항을 구조화된 형태로 추출해줘. "
            "이전에 파악된 정보가 있으면 그걸 기준으로 갱신하고, 새 메시지에서 "
            f"언급된 내용만 덮어써. 이전 정보: {prior}"
        ),
    }

    parsed: ParsedRequirements = await structured_llm.ainvoke([system_prompt, *masked_messages])
    parsed_dict = parsed.model_dump()

    missing = _find_missing_fields(parsed_dict)
    parsed_dict["needs_clarification"] = bool(missing)
    parsed_dict["missing_fields"] = missing

    result: dict = {
        "parsed_requirements": parsed_dict,
        "messages": masked_messages,  # 원문 대신 마스킹된 버전으로 state 갱신
    }
    if missing:
        result["final_output"] = {
            "type": "clarification_needed",
            "missing_fields": missing,
            "message": _build_clarification_message(missing),
        }
    return result