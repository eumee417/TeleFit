// 챗봇 페이지가 쓰는 백엔드 연동 — POST /api/recommend(잡 생성) + GET /api/recommend/:jobId(폴링).
// 무상태 원칙: 매 응답에 parsed_requirements가 같이 오므로, 다음 요청의 prior_requirements로
// 그대로 돌려보내야 이전 턴에서 파악한 정보(예: 되묻기에 대한 답)가 이어짐.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export interface DiscountTier {
  min_lines: number;
  discount_type: "RATE" | "AMOUNT";
  value: number;
}

export interface CombineProduct {
  combine_product_id: string;
  combine_type: string;
  discount_tiers: DiscountTier[];
  rules: {
    rule_type: string;
    condition_field: string;
    condition_operator: string;
    condition_value: string;
    effect_description: string;
  }[];
}

export interface RecommendCard {
  candidate_id: string;
  is_approximate: boolean;
  plan: {
    plan_id: string;
    plan_name?: string;
    carrier_name?: string;
    monthly_fee: number;
    data_gb: number;
    selective_discount_eligible: boolean;
  };
  combine_product: CombineProduct | null;
  handset: { handset_id: string; release_price: number } | null;
  monthly_cost: number | null;
  upfront_cost: number | null;
  total_24m_cost: number | null;
  subsidy_choice: string | null;
}

export type RecommendResult =
  | {
      type: "clarification_needed";
      missing_fields: string[];
      message: string;
      parsed_requirements: Record<string, unknown> | null;
    }
  | {
      type: "recommendation";
      cards: RecommendCard[];
      parsed_requirements: Record<string, unknown> | null;
    };

export interface RecommendJob {
  status: "pending" | "done" | "error";
  result?: RecommendResult;
  error?: string;
}

function requireBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.");
  }
  return BASE_URL;
}

export async function startRecommend(
  message: string,
  priorRequirements: Record<string, unknown> | null,
): Promise<string> {
  const res = await fetch(`${requireBaseUrl()}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, prior_requirements: priorRequirements }),
  });
  if (!res.ok) throw new Error("추천 요청을 시작하지 못했습니다.");
  const { jobId } = (await res.json()) as { jobId: string };
  return jobId;
}

export async function getRecommendJob(jobId: string): Promise<RecommendJob> {
  const res = await fetch(`${requireBaseUrl()}/api/recommend/${jobId}`);
  if (!res.ok) throw new Error("추천 결과를 불러오지 못했습니다.");
  return res.json();
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

export async function pollRecommendJob(jobId: string): Promise<RecommendResult> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const job = await getRecommendJob(jobId);
    if (job.status === "done" && job.result) return job.result;
    if (job.status === "error") throw new Error(job.error ?? "추천 처리 중 오류가 발생했습니다.");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("추천 응답이 너무 오래 걸려 중단했습니다.");
}
