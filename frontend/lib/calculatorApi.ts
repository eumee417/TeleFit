export interface PlanOption {
  id: number;
  carrier: string;
  name: string;
  basePrice: number;
  data: string;
  dataGB: number;
  callMinutes: number | null;
  watchFreeEligible: boolean;
}

export interface DeviceOption {
  id: number;
  name: string;
  category: "smartphone" | "watch" | "tablet";
  retailPrice: number;
  subsidy: number;
}

// fetchPlans()는 POST /api/plans/search, fetchDevices()는 GET /api/handsets와 연동됨
// (둘 다 NEXT_PUBLIC_API_BASE_URL 필요). devicePrice는 실제 출고가지만 subsidy(공시지원금)는
// handset_subsidies 데이터가 2건뿐이라 아직 0으로 둠 — 통신사별 공시지원금 조사 후 채울 것.
// 번호이동 전환지원금은 fetchMnpConversionSubsidy()가 선택된 요금제+단말기 조합으로 실시간 조회함.
const MOCK_PLANS: PlanOption[] = [
  { id: 1, carrier: "SKT", name: "5GX 레귤러+", basePrice: 89000, data: "110GB", dataGB: 110, callMinutes: null, watchFreeEligible: true },
  { id: 2, carrier: "SKT", name: "5G 슬림", basePrice: 55000, data: "12GB", dataGB: 12, callMinutes: 200, watchFreeEligible: false },
  { id: 3, carrier: "KT", name: "슈퍼플랜 베이직", basePrice: 85000, data: "무제한", dataGB: 999, callMinutes: null, watchFreeEligible: true },
  { id: 4, carrier: "KT", name: "5G Y세대", basePrice: 69000, data: "30GB", dataGB: 30, callMinutes: null, watchFreeEligible: false },
  { id: 5, carrier: "KT", name: "LTE 베이직", basePrice: 47000, data: "14GB", dataGB: 14, callMinutes: 300, watchFreeEligible: false },
  { id: 6, carrier: "LGU+", name: "5G 시그니처", basePrice: 95000, data: "무제한", dataGB: 999, callMinutes: null, watchFreeEligible: true },
  { id: 7, carrier: "LGU+", name: "5G 스탠다드", basePrice: 79000, data: "100GB", dataGB: 100, callMinutes: null, watchFreeEligible: false },
  { id: 8, carrier: "알뜰폰", name: "이야기 무제한", basePrice: 22000, data: "10GB+무제한", dataGB: 999, callMinutes: null, watchFreeEligible: false },
  { id: 9, carrier: "알뜰폰", name: "모빙 5G", basePrice: 38000, data: "50GB", dataGB: 50, callMinutes: null, watchFreeEligible: false },
];

// 오프라인/BASE_URL 미설정 시에만 쓰는 Mock 데이터.
const MOCK_DEVICES: DeviceOption[] = [
  { id: 1, name: "갤럭시 S25 Ultra (256GB)", category: "smartphone", retailPrice: 1_749_400, subsidy: 420_000 },
  { id: 2, name: "갤럭시 S25+ (256GB)", category: "smartphone", retailPrice: 1_359_000, subsidy: 380_000 },
  { id: 3, name: "갤럭시 S25 (256GB)", category: "smartphone", retailPrice: 1_099_000, subsidy: 320_000 },
  { id: 4, name: "아이폰 16 Pro Max (256GB)", category: "smartphone", retailPrice: 1_800_000, subsidy: 200_000 },
  { id: 5, name: "아이폰 16 Pro (256GB)", category: "smartphone", retailPrice: 1_650_000, subsidy: 180_000 },
  { id: 6, name: "아이폰 16 (128GB)", category: "smartphone", retailPrice: 1_250_000, subsidy: 150_000 },
  { id: 7, name: "갤럭시 워치 7 (LTE)", category: "watch", retailPrice: 399_000, subsidy: 80_000 },
  { id: 8, name: "갤럭시 워치 Ultra (LTE)", category: "watch", retailPrice: 749_000, subsidy: 100_000 },
];

// 오프라인 모드에서 번호이동 전환지원금 대신 보여줄 대표값.
const MOCK_MNP_CONVERSION_SUBSIDY = 100_000;

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const SIMULATED_DELAY = 600;

async function fakeFetch<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), SIMULATED_DELAY));
}

interface BackendPlan {
  planId: number;
  carrierName: string;
  planName: string;
  baseFee: number;
  dataGb: number;
  dataAllowance: string | null;
  voiceAllowance: string | null;
  selectiveDiscountEligible: boolean;
}

function toPlanOption(p: BackendPlan): PlanOption {
  return {
    id: p.planId,
    carrier: p.carrierName,
    name: p.planName,
    basePrice: p.baseFee,
    data: p.dataAllowance ?? (p.dataGb >= 999 ? "무제한" : `${p.dataGb}GB`),
    dataGB: p.dataGb,
    callMinutes: null, // 백엔드 voice_allowance는 텍스트 라벨이라 숫자로 못 바꿈
    watchFreeEligible: false, // 백엔드에 요금제별 워치 무료결합 여부 데이터가 아직 없음
  };
}

export async function fetchPlans(): Promise<PlanOption[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/plans/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("요금제 데이터를 불러오지 못했습니다.");
    const plans: BackendPlan[] = await res.json();
    return plans.map(toPlanOption);
  }
  return fakeFetch(MOCK_PLANS);
}

interface BackendHandset {
  handsetId: number;
  modelName: string;
  manufacturer: string;
  deviceCategory: string;
  releasePrice: number;
}

function toDeviceOption(h: BackendHandset): DeviceOption {
  return {
    id: h.handsetId,
    name: `${h.manufacturer} ${h.modelName}`,
    category: h.deviceCategory === "watch" || h.deviceCategory === "tablet" ? h.deviceCategory : "smartphone",
    retailPrice: h.releasePrice,
    // 공시지원금은 handset_subsidies 데이터가 2건뿐이라 아직 신뢰성 있게 못 채움 — 0으로 표시.
    subsidy: 0,
  };
}

export async function fetchDevices(): Promise<DeviceOption[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/handsets`);
    if (!res.ok) throw new Error("단말기 데이터를 불러오지 못했습니다.");
    const handsets: BackendHandset[] = await res.json();
    return handsets.map(toDeviceOption);
  }
  return fakeFetch(MOCK_DEVICES);
}

interface DeviceSubsidyResult {
  conversion_subsidy: number;
  error: string | null;
}

interface CalculateResponse {
  device_subsidy: DeviceSubsidyResult | null;
}

// 선택된 요금제+단말기 조합의 실제 번호이동 전환지원금을 조회한다.
// handset_subsidies 시드가 2건뿐이라 대부분 0을 반환하지만, 있는 조합은 실제 값이다.
export async function fetchMnpConversionSubsidy(planId: number, handsetId: number): Promise<number> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, handset_id: handsetId, subscription_type: "MNP" }),
    });
    if (!res.ok) throw new Error("번호이동 혜택 정보를 불러오지 못했습니다.");
    const data: CalculateResponse = await res.json();
    return data.device_subsidy?.conversion_subsidy ?? 0;
  }
  return fakeFetch(MOCK_MNP_CONVERSION_SUBSIDY);
}
