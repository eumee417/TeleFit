"""
Calculator Node

candidates: list[CandidateResult] (보통 3개)를 한 번의 노드 실행에서 전부 계산한다.
LLM이 후보별로 get_combine_discount / compare_device_subsidy를 필요한 만큼 호출하게 하고,
최종 합산(calculate_total_cost)은 LLM Tool이 아니라 코드로 처리해 각 candidate의
calculation_result에 채운다.

이전 버전(후보 1개 기준)과 달라진 점:
  - RetrievedContext를 candidates 안에 이미 박혀 있는 plan/combine_product/handset
    데이터로부터 조립한다 (Retriever가 별도 카탈로그를 안 주고, 후보마다 데이터를
    이미 채워서 준다는 최신 State 구조 기준)
  - calculate_total_cost가 plan_monthly_fee를 인자로 받도록 고쳐서
    base_monthly_fee=0 고정이던 이전 버그를 해결함
"""

from __future__ import annotations

from typing import Optional, TypedDict

from agent.core.llm import get_llm
from agent.core.state import AgentState, CandidateResult
from agent.tools.calculator import (
    CombineDiscountResult,
    CombineProductData,
    DeviceSubsidyResult,
    HandsetData,
    HandsetSubsidyData,
    PlanData,
    RetrievedContext,
    make_calculator_tools,
)


class TotalCostResult(TypedDict):
    monthly_cost: int
    upfront_cost: int
    total_24m_cost: int
    subsidy_choice: Optional[str]


def calculate_total_cost(
    plan_monthly_fee: int,
    combine_result: CombineDiscountResult | None,
    subsidy_result: DeviceSubsidyResult | None,
    handset_release_price: int = 0,
) -> TotalCostResult:
    """Calculator Tool 두 개의 결과를 합산해 카드에 들어갈 최종 숫자를 만든다.
    순수 함수 — Grader가 검증하기 쉬운 형태로 유지."""
    combine_discount = (
        combine_result.discount_amount if combine_result and not combine_result.error else 0
    )
    monthly_cost = max(plan_monthly_fee - combine_discount, 0)

    subsidy_choice = (
        subsidy_result.recommended_option if subsidy_result and not subsidy_result.error else None
    )

    if subsidy_result and not subsidy_result.error:
        if subsidy_result.recommended_option == "DEVICE_SUBSIDY":
            upfront_cost = max(
                handset_release_price
                - subsidy_result.device_subsidy_total
                - subsidy_result.conversion_subsidy,
                0,
            )
            total_24m_cost = monthly_cost * 24 + upfront_cost
        else:
            upfront_cost = handset_release_price
            total_24m_cost = (
                monthly_cost * 24 + handset_release_price - subsidy_result.plan_discount_total_24m
            )
    else:
        upfront_cost = handset_release_price
        total_24m_cost = monthly_cost * 24 + handset_release_price

    return TotalCostResult(
        monthly_cost=monthly_cost,
        upfront_cost=upfront_cost,
        total_24m_cost=max(total_24m_cost, 0),
        subsidy_choice=subsidy_choice,
    )


def _build_retrieved_context(candidates: list[CandidateResult]) -> RetrievedContext:
    """candidates 안에 이미 박혀 있는 plan/combine_product/handset을
    Calculator Tool이 기대하는 ID 기준 RetrievedContext로 합친다."""
    plans: dict[str, PlanData] = {}
    combine_products: dict[str, CombineProductData] = {}
    handsets: dict[str, HandsetData] = {}
    handset_subsidies: dict[str, HandsetSubsidyData] = {}

    for c in candidates:
        plan = c.get("plan")
        if plan:
            plans[plan["plan_id"]] = PlanData(**plan)

        combine = c.get("combine_product")
        if combine:
            combine_products[combine["combine_product_id"]] = CombineProductData(**combine)

        handset = c.get("handset")
        if handset:
            handsets[handset["handset_id"]] = HandsetData(**handset)
            # handset_subsidies는 Retriever가 handset dict 안에 "subsidy" 키로
            # 같이 실어준다고 가정 — 실제 구조 다르면 이 부분만 고치면 됨.
            subsidy = handset.get("subsidy")
            if subsidy and plan:
                key = f"{handset['handset_id']}:{plan['plan_id']}"
                handset_subsidies[key] = HandsetSubsidyData(**subsidy)

    return RetrievedContext(
        plans=plans,
        combine_products=combine_products,
        handsets=handsets,
        handset_subsidies=handset_subsidies,
    )


def _required_tools(c: CandidateResult) -> set[str]:
    """이 후보의 계산을 끝냈다고 볼 수 있으려면 LLM이 어떤 Tool을 호출했어야 하는지.
    combine_product/handset이 애초에 없는 후보는 그 Tool이 필요 없음."""
    combine = c.get("combine_product") or {}
    handset = c.get("handset") or {}
    required = set()
    if combine.get("combine_product_id"):
        required.add("get_combine_discount")
    if handset.get("handset_id"):
        required.add("compare_device_subsidy")
    return required


async def calculator_node(state: AgentState) -> dict:
    candidates = state.get("candidates", [])
    if not candidates:
        return {"candidates": [], "tried_combinations": state.get("tried_combinations", [])}

    # Grader가 이미 VALID/FALLBACK으로 확정한 후보는 재계산하지 않음 —
    # 재시도 루프에서 통과한 후보를 덮어써 결과가 흔들리는 걸 막기 위함.
    pending = [c for c in candidates if c["status"] == "PENDING"]
    if not pending:
        return {"candidates": candidates, "tried_combinations": state.get("tried_combinations", [])}

    retrieved = _build_retrieved_context(pending)
    tools = make_calculator_tools(retrieved)
    tools_by_name = {t.name: t for t in tools}

    llm = get_llm()
    bound_llm = llm.bind_tools(tools)

    tried_so_far: list[dict] = list(state.get("tried_combinations", []))
    pending_plan_ids = {c["plan"]["plan_id"] for c in pending}
    # 이번 라운드 후보들과 관련된 과거 시도만 추려서 프롬프트에 보여줌 —
    # 이미 호출/실패했던 조합을 LLM이 그대로 반복하지 않게 하기 위함.
    relevant_history = [t for t in tried_so_far if t.get("args", {}).get("plan_id") in pending_plan_ids]

    # 후보 목록을 프롬프트에 명시해서 LLM이 각 후보의 ID로 Tool을 호출하게 함.
    # TODO: 실제 시스템 프롬프트/포맷은 Router가 만든 messages 구조에 맞춰 다듬을 것.
    candidate_lines = []
    for c in pending:
        combine = c.get("combine_product") or {}
        handset = c.get("handset") or {}
        candidate_lines.append(
            f"- candidate_id={c['candidate_id']}, plan_id={c['plan']['plan_id']}, "
            f"combine_product_id={combine.get('combine_product_id')}, "
            f"handset_id={handset.get('handset_id')}"
        )

    history_block = ""
    if relevant_history:
        history_lines = [f"- {h['tool']}({h['args']}) -> {h['result']}" for h in relevant_history]
        history_block = (
            "\n\n이전 시도 기록(이미 호출했던 Tool과 결과 — 성공한 호출은 반복하지 말고, "
            "아직 못 채운 후보만 다시 호출해):\n" + "\n".join(history_lines)
        )

    messages = list(state.get("messages", [])) + [
        {
            "role": "user",
            "content": (
                "아래 후보 전부에 대해 결합할인(get_combine_discount)과 "
                "단말기 지원금 비교(compare_device_subsidy)를 계산해줘. "
                "후보마다 필요한 Tool을 호출해:\n" + "\n".join(candidate_lines) + history_block
            ),
        }
    ]

    response = await bound_llm.ainvoke(messages)

    results_by_plan: dict[str, dict] = {}
    tried: list[dict] = list(tried_so_far)

    for tool_call in getattr(response, "tool_calls", []):
        tool_fn = tools_by_name.get(tool_call["name"])
        if tool_fn is None:
            continue
        raw_result = tool_fn.invoke(tool_call["args"])
        tried.append({"tool": tool_call["name"], "args": tool_call["args"], "result": raw_result})

        plan_id = tool_call["args"].get("plan_id")
        if plan_id is None:
            continue
        bucket = results_by_plan.setdefault(plan_id, {})
        if tool_call["name"] == "get_combine_discount":
            bucket["combine"] = CombineDiscountResult(**raw_result)
        elif tool_call["name"] == "compare_device_subsidy":
            bucket["subsidy"] = DeviceSubsidyResult(**raw_result)

    updated_candidates: list[CandidateResult] = []
    for c in candidates:
        if c["status"] != "PENDING":
            updated_candidates.append(c)  # Grader가 이미 확정한 결과는 그대로 보존
            continue

        plan_id = c["plan"]["plan_id"]
        bucket = results_by_plan.get(plan_id, {})
        combine_result = bucket.get("combine")
        subsidy_result = bucket.get("subsidy")
        handset = c.get("handset") or {}

        missing = [
            name
            for name in _required_tools(c)
            if (name == "get_combine_discount" and combine_result is None)
            or (name == "compare_device_subsidy" and subsidy_result is None)
        ]
        if missing:
            # LLM이 이 후보에 필요한 Tool을 안 불렀음. calculation_result를 채워버리면
            # Grader가 "계산 완료(할인 0원)"로 오인해 그대로 VALID 처리해버리므로,
            # 여기서는 PENDING을 유지해 다음 라운드에서 다시 시도하게 한다.
            tried.append(
                {
                    "tool": "missing_tool_call",
                    "args": {"candidate_id": c["candidate_id"], "plan_id": plan_id},
                    "result": {"missing": missing},
                }
            )
            updated_candidates.append(dict(c))  # type: ignore[arg-type]
            continue

        total_cost = calculate_total_cost(
            plan_monthly_fee=c["plan"].get("monthly_fee", 0),
            combine_result=combine_result,
            subsidy_result=subsidy_result,
            handset_release_price=handset.get("release_price", 0),
        )

        new_c: CandidateResult = dict(c)  # type: ignore[assignment]
        new_c["calculation_result"] = {
            "combine": combine_result.model_dump() if combine_result else None,
            "subsidy": subsidy_result.model_dump() if subsidy_result else None,
            "total_cost": total_cost,
        }
        # status는 여기서 안 건드림 — VALID/FALLBACK 판정은 Grader 몫.
        updated_candidates.append(new_c)

    return {"candidates": updated_candidates, "tried_combinations": tried}