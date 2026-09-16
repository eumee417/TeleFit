"""
Calculator Tool — get_combine_discount / compare_device_subsidy

원칙: 이 파일의 함수들은 DB에 직접 접근하지 않는다.
Retriever 노드가 이미 조회해서 AgentState에 실어둔 데이터를
make_calculator_tools(retrieved) 호출 시 클로저로 묶어서 사용한다.

Retriever는 DB row를 아래 *_Data 모델 형태로 매핑해서 넘겨줘야 한다.
실제 schema_full.sql 컬럼명과 다르면 이 파일의 필드명을 맞춰서 조정할 것.
"""

from __future__ import annotations

from typing import Literal, Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Retriever -> Calculator 데이터 계약 (in-memory, DB 아님)
# ---------------------------------------------------------------------------


class DiscountTier(BaseModel):
    min_lines: int
    discount_type: Literal["RATE", "AMOUNT"]
    value: float  # RATE면 0~1 비율, AMOUNT면 원 단위 정액


class PlanData(BaseModel):
    plan_id: str
    monthly_fee: int  # 할인 전 기본 요금 (원)
    selective_discount_eligible: bool


class CombineProductData(BaseModel):
    combine_product_id: str
    combine_type: str
    discount_tiers: list[DiscountTier]


class HandsetData(BaseModel):
    handset_id: str
    release_price: int


class HandsetSubsidyData(BaseModel):
    handset_id: str
    plan_id: str
    device_subsidy: int  # 공통지원금(구 공시지원금), 원
    conversion_subsidy: int = 0  # 번호이동 전환지원금, 데이터 없으면 0


class RetrievedContext(BaseModel):
    """Retriever 노드가 채워서 넘기는 컨테이너. 실제로는 dict of dict로 관리해도 무방."""

    plans: dict[str, PlanData]
    combine_products: dict[str, CombineProductData]
    handsets: dict[str, HandsetData]
    # key: f"{handset_id}:{plan_id}"
    handset_subsidies: dict[str, HandsetSubsidyData]


# ---------------------------------------------------------------------------
# Tool 1: get_combine_discount
# ---------------------------------------------------------------------------


class GetCombineDiscountArgs(BaseModel):
    plan_id: str = Field(description="대상 요금제 ID")
    combine_product_id: Optional[str] = Field(
        default=None,
        description="결합상품 ID. 결합 없이 단독 요금제만 계산할 경우 생략(null)",
    )


class CombineDiscountResult(BaseModel):
    plan_id: str
    combine_product_id: Optional[str]
    discount_amount: int  # 월 할인액(원)
    discount_type: Optional[Literal["RATE", "AMOUNT"]] = None
    applied_tier: Optional[DiscountTier] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Tool 2: compare_device_subsidy
# ---------------------------------------------------------------------------


class CompareDeviceSubsidyArgs(BaseModel):
    handset_id: str = Field(description="대상 단말기 ID")
    plan_id: str = Field(description="대상 요금제 ID")
    subscription_type: Literal["UPGRADE", "MNP"] = Field(
        description="UPGRADE=기기변경, MNP=번호이동"
    )


class DeviceSubsidyResult(BaseModel):
    handset_id: str
    plan_id: str
    subscription_type: Literal["UPGRADE", "MNP"]
    device_subsidy_total: int  # 공통지원금
    conversion_subsidy: int  # 번호이동 시 전환지원금, UPGRADE면 0
    plan_discount_total_24m: int  # 선택약정 24개월 총 할인액
    recommended_option: Literal["DEVICE_SUBSIDY", "SELECTIVE_DISCOUNT"]
    error: Optional[str] = None


# 2026-09 기준. 선택약정 할인율은 단통법 폐지(2025-07-22) 이후에도 25%로 변동 없음.
SELECTIVE_DISCOUNT_RATE = 0.25
CONTRACT_MONTHS = 24


def make_calculator_tools(retrieved: RetrievedContext):
    """
    Retriever가 채운 RetrievedContext를 클로저로 묶어
    LLM에 노출할 Tool 2개(get_combine_discount, compare_device_subsidy)를 생성한다.
    """

    @tool(args_schema=GetCombineDiscountArgs)
    def get_combine_discount(plan_id: str, combine_product_id: str | None = None) -> dict:
        """요금제와 결합상품을 근거로 월 결합할인액을 계산한다."""
        plan = retrieved.plans.get(plan_id)
        if plan is None:
            return CombineDiscountResult(
                plan_id=plan_id,
                combine_product_id=combine_product_id,
                discount_amount=0,
                error=f"plan_id '{plan_id}'를 retrieved context에서 찾을 수 없음",
            ).model_dump()

        if combine_product_id is None:
            return CombineDiscountResult(
                plan_id=plan_id,
                combine_product_id=None,
                discount_amount=0,
            ).model_dump()

        combine = retrieved.combine_products.get(combine_product_id)
        if combine is None or not combine.discount_tiers:
            return CombineDiscountResult(
                plan_id=plan_id,
                combine_product_id=combine_product_id,
                discount_amount=0,
                error=f"combine_product_id '{combine_product_id}'를 찾을 수 없거나 discount_tiers 없음",
            ).model_dump()

        # TODO: 실제로는 결합 회선 수(가족 구성원 수)에 맞는 tier를 골라야 함.
        # 지금은 회선 수 입력이 State에 아직 안 들어와서 최소 min_lines tier로 단순화.
        # Router/Retriever에서 line_count가 넘어오면 이 로직을 교체할 것.
        tier = min(combine.discount_tiers, key=lambda t: t.min_lines)
        if tier.discount_type == "RATE":
            discount_amount = round(plan.monthly_fee * tier.value)
        else:
            discount_amount = round(tier.value)

        return CombineDiscountResult(
            plan_id=plan_id,
            combine_product_id=combine_product_id,
            discount_amount=discount_amount,
            discount_type=tier.discount_type,
            applied_tier=tier,
        ).model_dump()

    @tool(args_schema=CompareDeviceSubsidyArgs)
    def compare_device_subsidy(
        handset_id: str, plan_id: str, subscription_type: Literal["UPGRADE", "MNP"]
    ) -> dict:
        """단말기·요금제 기준 공통지원금(구 공시지원금)과 선택약정 24개월 총 할인액을 비교하고,
        번호이동(MNP)이면 전환지원금까지 반영해 어느 쪽이 유리한지 판단한다."""
        plan = retrieved.plans.get(plan_id)
        handset = retrieved.handsets.get(handset_id)
        if plan is None or handset is None:
            return DeviceSubsidyResult(
                handset_id=handset_id,
                plan_id=plan_id,
                subscription_type=subscription_type,
                device_subsidy_total=0,
                conversion_subsidy=0,
                plan_discount_total_24m=0,
                recommended_option="SELECTIVE_DISCOUNT",
                error="plan_id 또는 handset_id를 retrieved context에서 찾을 수 없음",
            ).model_dump()

        subsidy = retrieved.handset_subsidies.get(f"{handset_id}:{plan_id}")
        device_subsidy_total = subsidy.device_subsidy if subsidy else 0

        plan_discount_total_24m = (
            round(plan.monthly_fee * SELECTIVE_DISCOUNT_RATE) * CONTRACT_MONTHS
            if plan.selective_discount_eligible
            else 0
        )

        conversion_subsidy = 0
        if subscription_type == "MNP" and subsidy is not None:
            conversion_subsidy = subsidy.conversion_subsidy

        device_subsidy_option_total = device_subsidy_total + conversion_subsidy
        recommended: Literal["DEVICE_SUBSIDY", "SELECTIVE_DISCOUNT"] = (
            "DEVICE_SUBSIDY"
            if device_subsidy_option_total > plan_discount_total_24m
            else "SELECTIVE_DISCOUNT"
        )

        return DeviceSubsidyResult(
            handset_id=handset_id,
            plan_id=plan_id,
            subscription_type=subscription_type,
            device_subsidy_total=device_subsidy_total,
            conversion_subsidy=conversion_subsidy,
            plan_discount_total_24m=plan_discount_total_24m,
            recommended_option=recommended,
        ).model_dump()

    return [get_combine_discount, compare_device_subsidy]