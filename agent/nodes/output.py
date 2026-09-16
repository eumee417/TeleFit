"""
Output Node

candidates 중 status가 VALID 또는 FALLBACK인 것만 카드로 정리해서 반환.
LLM 안 씀 — 순수 포맷팅 노드 (계산은 이미 Calculator/Grader에서 끝났음).
월 총비용(total_24m_cost) 오름차순 정렬 — 사용자에게 저렴한 순으로 보여주는 게
기본값으로 합리적이라고 판단해서 넣음, 다른 정렬 기준 원하면 여기만 고치면 됨.
"""

from __future__ import annotations

from agent.core.state import AgentState, CandidateResult


async def output_node(state: AgentState) -> dict:
    candidates = state.get("candidates", [])
    resolved = [c for c in candidates if c["status"] in ("VALID", "FALLBACK")]

    cards = [_build_card(c) for c in resolved]
    cards.sort(key=lambda card: card["total_24m_cost"] if card["total_24m_cost"] is not None else float("inf"))

    return {
        "final_output": {
            "type": "recommendation",
            "cards": cards,
        }
    }


def _build_card(c: CandidateResult) -> dict:
    calc = c.get("calculation_result") or {}
    total_cost = calc.get("total_cost") or {}

    return {
        "candidate_id": c["candidate_id"],
        "is_approximate": c["status"] == "FALLBACK",  # Grader 재시도 상한 초과로 근사치 확정된 카드
        "plan": c["plan"],
        "combine_product": c.get("combine_product"),
        "handset": c.get("handset"),
        "monthly_cost": total_cost.get("monthly_cost"),
        "upfront_cost": total_cost.get("upfront_cost"),
        "total_24m_cost": total_cost.get("total_24m_cost"),
        "subsidy_choice": total_cost.get("subsidy_choice"),
    }