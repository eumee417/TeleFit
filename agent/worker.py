"""
worker.py — Agent 서비스의 FastAPI 엔트리포인트.

Redis를 모르는 순수 FastAPI 서비스 (절대 원칙) — NestJS가 이 엔드포인트들을
동기 HTTP로 호출하고, jobId/폴링/Redis는 NestJS(backend/src/jobs/)가 전담한다.

엔드포인트:
  POST /recommend — Router~Output 5단계 파이프라인 실행 (요금제 추천 유스케이스)
  POST /calculate — Calculator Tool만 단독 실행. 사용자가 이미 plan/combine/handset을
                     직접 골랐다는 전제라 "어떤 Tool을 부를지" 판단이 필요 없어서
                     LLM 없이 Tool 함수를 코드로 직접 invoke함 (비용 계산기 유스케이스)
  GET  /health     — 컨테이너 헬스체크용

"요금제 단순 조회" 유스케이스는 LangGraph/Python 미사용(SQL만)이라 여기 없음 —
NestJS가 직접 DB 조회한다고 가정.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 실행 위치(cwd)에 상관없이 항상 agent/.env를 찾도록 이 파일 기준 경로를 명시.
# (인자 없는 load_dotenv()는 호출 프레임을 거슬러 올라가며 탐색하는데,
#  실행 방식에 따라 agent/.env를 못 찾는 경우가 있었음.)
load_dotenv(Path(__file__).resolve().parent / ".env")

from agent.core.db import close_pool, get_pool
from agent.core.graph import build_graph
from agent.nodes.calculator import calculate_total_cost
from agent.nodes.retriever import fetch_combine_product, fetch_handset_by_id, fetch_plan_by_id
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

app = FastAPI(title="telefit-agent")
_graph = build_graph()


@app.on_event("shutdown")
async def _on_shutdown() -> None:
    await close_pool()


# ---------------------------------------------------------------------------
# POST /recommend
# ---------------------------------------------------------------------------


class RecommendRequest(BaseModel):
    message: str
    prior_requirements: Optional[dict] = None  # 무상태 원칙: 되묻기 이후 프론트가 다시 실어줌


@app.post("/recommend")
async def recommend(req: RecommendRequest) -> dict:
    initial_state = {
        "parsed_requirements": req.prior_requirements or {},
        "messages": [{"role": "user", "content": req.message}],
        "context": "",
        "candidates": [],
        "retry_count": 0,
        "tried_combinations": [],
        "final_output": None,
    }
    try:
        final_state = await _graph.ainvoke(initial_state)
    except Exception as e:  # noqa: BLE001 — 일단 500으로 감싸서 원인 노출, 로깅 체계는 별도 TODO
        raise HTTPException(status_code=500, detail=str(e)) from e

    # 무상태 원칙: parsed_requirements를 응답에 실어 보내야 프론트가 다음 요청의
    # prior_requirements로 그대로 되돌려줄 수 있음 (클라리피케이션이든 추천 완료든 항상 포함).
    return {
        **final_state["final_output"],
        "parsed_requirements": final_state.get("parsed_requirements"),
    }


# ---------------------------------------------------------------------------
# POST /calculate — Calculator Tool 단독 노출, LLM 없이 결정론적 계산
# ---------------------------------------------------------------------------


class CalculateRequest(BaseModel):
    plan_id: int
    combine_product_id: Optional[int] = None  # 지정하면 결합할인 계산, 없으면 단독 요금제
    family_line_count: int = 1
    handset_id: Optional[int] = None
    subscription_type: Optional[Literal["UPGRADE", "MNP"]] = None  # handset_id 지정 시 필수


@app.post("/calculate")
async def calculate(req: CalculateRequest) -> dict:
    if req.handset_id is not None and req.subscription_type is None:
        raise HTTPException(status_code=400, detail="handset_id를 주려면 subscription_type도 필요함")

    pool = await get_pool()
    async with pool.acquire() as conn:
        prow = await fetch_plan_by_id(conn, req.plan_id)
        if prow is None:
            raise HTTPException(status_code=404, detail=f"plan_id {req.plan_id} not found")

        plan = {
            "plan_id": str(prow["plan_id"]),
            "monthly_fee": prow["base_fee"],
            "data_gb": prow["data_gb"],
            "selective_discount_eligible": prow["selective_discount_eligible"],
        }

        combine = None
        if req.combine_product_id is not None:
            combine = await fetch_combine_product(conn, prow["carrier_id"], req.family_line_count)
            if combine is None:
                raise HTTPException(status_code=404, detail="해당 통신사의 결합상품을 찾을 수 없음")

        handset = None
        if req.handset_id is not None:
            hrow = await fetch_handset_by_id(conn, req.handset_id)
            if hrow is None:
                raise HTTPException(status_code=404, detail=f"handset_id {req.handset_id} not found")

            subsidy_row = await conn.fetchrow(
                """
                SELECT public_subsidy, transfer_subsidy
                FROM handset_subsidies
                WHERE handset_id = $1 AND carrier_id = $2 AND join_type = $3
                  AND min_plan_fee <= $4
                ORDER BY min_plan_fee DESC
                LIMIT 1
                """,
                req.handset_id,
                prow["carrier_id"],
                req.subscription_type,
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

    retrieved = RetrievedContext(
        plans={plan["plan_id"]: PlanData(**plan)},
        combine_products=(
            {combine["combine_product_id"]: CombineProductData(**combine)} if combine else {}
        ),
        handsets=(
            {handset["handset_id"]: HandsetData(**{k: v for k, v in handset.items() if k != "subsidy"})}
            if handset
            else {}
        ),
        handset_subsidies=(
            {f"{handset['handset_id']}:{plan['plan_id']}": HandsetSubsidyData(**handset["subsidy"])}
            if handset and handset.get("subsidy")
            else {}
        ),
    )
    tools = {t.name: t for t in make_calculator_tools(retrieved)}

    combine_result = None
    if combine:
        raw = tools["get_combine_discount"].invoke(
            {"plan_id": plan["plan_id"], "combine_product_id": combine["combine_product_id"]}
        )
        combine_result = CombineDiscountResult(**raw)

    subsidy_result = None
    if handset:
        raw = tools["compare_device_subsidy"].invoke(
            {
                "handset_id": handset["handset_id"],
                "plan_id": plan["plan_id"],
                "subscription_type": req.subscription_type,
            }
        )
        subsidy_result = DeviceSubsidyResult(**raw)

    total_cost = calculate_total_cost(
        plan_monthly_fee=plan["monthly_fee"],
        combine_result=combine_result,
        subsidy_result=subsidy_result,
        handset_release_price=handset["release_price"] if handset else 0,
    )

    return {
        "plan": plan,
        "combine_product": combine,
        "handset": handset,
        "combine_discount": combine_result.model_dump() if combine_result else None,
        "device_subsidy": subsidy_result.model_dump() if subsidy_result else None,
        "total_cost": total_cost,
    }


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}