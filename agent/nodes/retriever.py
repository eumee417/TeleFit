"""
Retriever Node

parsed_requirements 기준으로 plans/combine_products/combine_discount_tiers/
handsets/handset_subsidies를 SQL로 조회해서 candidates: list[CandidateResult]
(최대 3개)를 만든다. DB 접근은 이 노드에서만 일어난다 (절대 원칙).

벡터 검색(하이브리드의 절반)은 terms_documents 테이블이 지금 비어 있어서
사실상 no-op으로 둠 — _summarize()가 그 자리를 임시로 채우고 있고,
terms_documents에 데이터 들어오면 여기를 실제 임베딩 검색+리랭커로 교체할 것.

schema_full.sql 기준 실제 스키마 (2026-09 확인):
  carriers(carrier_id, carrier_name, carrier_type)
  plans(plan_id, carrier_id, base_fee, data_gb, selective_discount_eligible)
  combine_products(combine_product_id, carrier_id, combine_type_id, product_name)
  combine_types(combine_type_id, type_name)
  combine_discount_tiers(combine_product_id, min_line_count, max_line_count,
                          discount_type, discount_rate, discount_amount)
  handsets(handset_id, model_name, device_category, release_price)
  handset_subsidies(handset_id, carrier_id, join_type, min_plan_fee,
                     public_subsidy, transfer_subsidy)
    -- plan_id가 아니라 carrier_id + min_plan_fee 티어 구조. 후보 플랜의 base_fee로
    -- min_plan_fee <= base_fee인 행 중 min_plan_fee가 가장 큰 걸 선택.

Calculator Tool(agent/tools/calculator.py)의 PlanData/CombineProductData/
HandsetSubsidyData 계약은 그대로 두고, 여기서 DB 로우 -> 계약 형태로 매핑만 함
(예: base_fee -> monthly_fee, public_subsidy -> device_subsidy).
"""

from __future__ import annotations

from agent.core.db import get_pool
from agent.core.state import AgentState, CandidateResult

CANDIDATE_LIMIT = 3


async def retriever_node(state: AgentState) -> dict:
    req = state.get("parsed_requirements", {})
    pool = await get_pool()

    candidates: list[CandidateResult] = []
    async with pool.acquire() as conn:
        plan_rows = await _fetch_plans(conn, req)

        for i, prow in enumerate(plan_rows):
            carrier_id = prow["carrier_id"]
            plan = {
                "plan_id": str(prow["plan_id"]),
                "monthly_fee": prow["base_fee"],
                "data_gb": prow["data_gb"],
                "selective_discount_eligible": prow["selective_discount_eligible"],
            }

            combine = await fetch_combine_product(conn, carrier_id, req.get("family_line_count", 1))

            handset = None
            if req.get("wants_new_device"):
                hrow = await _fetch_handset(conn, req.get("handset_model"))
                if hrow:
                    subsidy_row = await conn.fetchrow(
                        """
                        SELECT public_subsidy, transfer_subsidy
                        FROM handset_subsidies
                        WHERE handset_id = $1 AND carrier_id = $2 AND join_type = $3
                          AND min_plan_fee <= $4
                        ORDER BY min_plan_fee DESC
                        LIMIT 1
                        """,
                        hrow["handset_id"],
                        carrier_id,
                        req.get("subscription_type"),
                        prow["base_fee"],
                    )
                    handset = {
                        "handset_id": str(hrow["handset_id"]),
                        "release_price": hrow["release_price"],
                        "subsidy": (
                            {
                                "handset_id": str(hrow["handset_id"]),
                                "plan_id": str(prow["plan_id"]),
                                "device_subsidy": subsidy_row["public_subsidy"],
                                "conversion_subsidy": subsidy_row["transfer_subsidy"],
                            }
                            if subsidy_row
                            else None
                        ),
                    }

            candidates.append(
                CandidateResult(
                    candidate_id=f"cand_{i}",
                    plan=plan,
                    combine_product=combine,
                    handset=handset,
                    calculation_result=None,
                    validation_result=None,
                    status="PENDING",
                )
            )

    return {"context": _summarize(candidates), "candidates": candidates}


async def _fetch_plans(conn, req: dict):
    conditions = ["1=1"]
    params: list = []

    if req.get("carrier"):
        params.append(req["carrier"])
        conditions.append(f"c.carrier_name = ${len(params)}")

    if req.get("data_gb") and not req.get("unlimited_data"):
        params.append(req["data_gb"])
        conditions.append(f"p.data_gb >= ${len(params)}")
    # TODO: unlimited_data=true 필터는 현재 스키마만으로는 애매함.
    # data_gb=0이 무제한을 뜻하는지, data_allowance(VARCHAR) 텍스트로 판단해야 하는지
    # 확인 필요 — 지금은 unlimited_data=true면 data_gb 조건 자체를 건너뜀.

    if req.get("monthly_budget"):
        params.append(req["monthly_budget"])
        conditions.append(f"p.base_fee <= ${len(params)}")

    query = f"""
        SELECT p.plan_id, p.carrier_id, p.base_fee, p.data_gb, p.selective_discount_eligible
        FROM plans p
        JOIN carriers c ON c.carrier_id = p.carrier_id
        WHERE {' AND '.join(conditions)}
        ORDER BY p.base_fee ASC
        LIMIT {CANDIDATE_LIMIT}
    """
    return await conn.fetch(query, *params)


async def fetch_combine_product(conn, carrier_id: int, family_line_count: int) -> dict | None:
    crow = await conn.fetchrow(
        """
        SELECT cp.combine_product_id, ct.type_name
        FROM combine_products cp
        JOIN combine_types ct ON ct.combine_type_id = cp.combine_type_id
        WHERE cp.carrier_id = $1
        LIMIT 1
        """,
        carrier_id,
    )
    if crow is None:
        return None

    # family_line_count에 맞는 tier만 미리 걸러서 넘김 (Calculator Tool의
    # min() 기반 tier 선택 로직이 굳이 안 바뀌어도 맞게 동작하게 함)
    tier_rows = await conn.fetch(
        """
        SELECT min_line_count, discount_type, discount_rate, discount_amount
        FROM combine_discount_tiers
        WHERE combine_product_id = $1
          AND min_line_count <= $2
          AND (max_line_count IS NULL OR max_line_count >= $2)
        """,
        crow["combine_product_id"],
        family_line_count,
    )

    # combine_rules도 여기서 같이 가져옴 — DB 접근은 Retriever로만 원칙이라
    # Grader가 검증 시점에 직접 쿼리할 수 없음. rule_type='ELIGIBILITY'만
    # Grader가 통과/실패 판정에 씀 (DEVICE_BENEFIT은 아직 어디서도 적용 안 함 — TODO).
    rule_rows = await conn.fetch(
        """
        SELECT rule_type, condition_field, condition_operator, condition_value, effect_description
        FROM combine_rules
        WHERE combine_product_id = $1
        """,
        crow["combine_product_id"],
    )

    return {
        "combine_product_id": str(crow["combine_product_id"]),
        "combine_type": crow["type_name"],
        "discount_tiers": [
            {
                "min_lines": t["min_line_count"],
                "discount_type": t["discount_type"],
                "value": (
                    float(t["discount_rate"]) if t["discount_type"] == "RATE" else t["discount_amount"]
                ),
            }
            for t in tier_rows
        ],
        "rules": [
            {
                "rule_type": r["rule_type"],
                "condition_field": r["condition_field"],
                "condition_operator": r["condition_operator"],
                "condition_value": r["condition_value"],
                "effect_description": r["effect_description"],
            }
            for r in rule_rows
        ],
    }


async def fetch_plan_by_id(conn, plan_id: int):
    """/calculate처럼 후보 검색이 아니라 특정 plan_id를 정확히 조회할 때 씀."""
    return await conn.fetchrow(
        "SELECT plan_id, carrier_id, base_fee, data_gb, selective_discount_eligible "
        "FROM plans WHERE plan_id = $1",
        plan_id,
    )


async def fetch_handset_by_id(conn, handset_id: int):
    return await conn.fetchrow(
        "SELECT handset_id, model_name, release_price FROM handsets WHERE handset_id = $1",
        handset_id,
    )


async def _fetch_handset(conn, handset_model: str | None):
    if handset_model:
        return await conn.fetchrow(
            "SELECT handset_id, model_name, release_price FROM handsets "
            "WHERE device_category = 'smartphone' AND model_name ILIKE $1 LIMIT 1",
            f"%{handset_model}%",
        )
    return await conn.fetchrow(
        "SELECT handset_id, model_name, release_price FROM handsets "
        "WHERE device_category = 'smartphone' LIMIT 1"
    )


def _summarize(candidates: list[CandidateResult]) -> str:
    """벡터 검색 자리. terms_documents가 비어 있는 동안은 구조화 데이터 요약 텍스트로 대체.
    TODO: terms_documents 채워지면 임베딩 검색 + get_reranker() 적용."""
    lines = []
    for c in candidates:
        plan = c["plan"]
        lines.append(f"{c['candidate_id']}: 월 {plan.get('monthly_fee')}원, {plan.get('data_gb')}GB")
    return "\n".join(lines)