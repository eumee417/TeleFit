"use client";

import { useState } from "react";

type Tab = "mobile" | "device";
type Carrier = "전체" | "SKT" | "KT" | "LGU+" | "알뜰폰";
type Category = "전체" | "5G" | "LTE" | "무제한" | "데이터나눔";

interface MobilePlan {
  id: number;
  name: string;
  carrier: Exclude<Carrier, "전체">;
  category: Exclude<Category, "전체">;
  price: number;
  data: string;
  call: string;
  sms: string;
  speed: string;
  badge?: string;
  highlight?: boolean;
}

interface DevicePlan {
  id: number;
  carrier: string;
  device: string;
  type: string;
  monthlyFee: number;
  freeEligiblePlan: string;
  dataShare: string;
  condition: string;
  badge?: string;
}

// [TODO: DB/API 연동 필요]
// 아래 MOBILE_PLANS 및 DEVICE_PLANS는 추후 백엔드 DB(Supabase, REST API 등)에서 불러오도록 변경해야 합니다.
// 서버 연동 시 useState와 useEffect를 사용하여 비동기 통신으로 데이터를 받아오세요.
const MOBILE_PLANS: MobilePlan[] = [
  { id: 1,  carrier: "SKT",   name: "5GX 플래티넘",    category: "5G",   price: 130000, data: "무제한",  call: "무제한", sms: "무제한", speed: "최대 10Gbps",  badge: "프리미엄" },
  { id: 2,  carrier: "SKT",   name: "5GX 레귤러+",     category: "5G",   price: 89000,  data: "110GB", call: "무제한", sms: "무제한", speed: "최대 10Gbps",  highlight: true, badge: "인기" },
  { id: 3,  carrier: "SKT",   name: "5G 슬림",         category: "5G",   price: 55000,  data: "12GB",  call: "200분",  sms: "무제한", speed: "최대 10Gbps" },
  { id: 4,  carrier: "KT",    name: "슈퍼플랜 베이직", category: "5G",   price: 85000,  data: "완전무제한", call: "무제한", sms: "무제한", speed: "최대 10Gbps", badge: "추천" },
  { id: 5,  carrier: "KT",    name: "5G Y세대",        category: "5G",   price: 69000,  data: "30GB",  call: "무제한", sms: "무제한", speed: "최대 10Gbps" },
  { id: 6,  carrier: "KT",    name: "LTE 베이직",      category: "LTE",  price: 47000,  data: "14GB",  call: "300분",  sms: "무제한", speed: "최대 150Mbps" },
  { id: 7,  carrier: "LGU+",  name: "5G 시그니처",     category: "5G",   price: 95000,  data: "완전무제한", call: "무제한", sms: "무제한", speed: "최대 10Gbps" },
  { id: 8,  carrier: "LGU+",  name: "5G 스탠다드",     category: "5G",   price: 79000,  data: "100GB", call: "무제한", sms: "무제한", speed: "최대 10Gbps",  badge: "인기" },
  { id: 9,  carrier: "LGU+",  name: "LTE 라이트",      category: "LTE",  price: 42000,  data: "8GB",   call: "200분",  sms: "무제한", speed: "최대 150Mbps" },
  { id: 10, carrier: "알뜰폰", name: "헬로 모바일 LTE", category: "LTE",  price: 16500,  data: "11GB",  call: "100분",  sms: "무제한", speed: "최대 150Mbps", badge: "최저가" },
  { id: 11, carrier: "알뜰폰", name: "이야기 무제한",   category: "무제한", price: 22000, data: "10GB+", call: "무제한", sms: "무제한", speed: "최대 150Mbps", highlight: true, badge: "인기" },
  { id: 12, carrier: "알뜰폰", name: "모빙 5G",         category: "5G",   price: 38000,  data: "50GB",  call: "무제한", sms: "무제한", speed: "최대 10Gbps" },
];

const DEVICE_PLANS: DevicePlan[] = [
  { id: 1, carrier: "SKT",   device: "갤럭시 워치 7 (LTE)",      type: "스마트워치", monthlyFee: 11000, freeEligiblePlan: "5GX 레귤러+ 이상",  dataShare: "워치 전용 데이터",  condition: "T끼리 플랜 가입 필수",         badge: "워치 무료 가능" },
  { id: 2, carrier: "SKT",   device: "갤럭시 워치 Ultra (LTE)",   type: "스마트워치", monthlyFee: 11000, freeEligiblePlan: "5GX 플래티넘",      dataShare: "워치 전용 데이터",  condition: "프리미엄 플랜 한정",           badge: "프리미엄" },
  { id: 3, carrier: "KT",    device: "갤럭시 워치 7 (LTE)",      type: "스마트워치", monthlyFee: 0,     freeEligiblePlan: "슈퍼플랜 베이직 이상", dataShare: "모바일 데이터 공유", condition: "가족결합 2회선 이상 필수",     badge: "무료 결합" },
  { id: 4, carrier: "KT",    device: "Apple Watch Series 10 (LTE)", type: "스마트워치", monthlyFee: 8800, freeEligiblePlan: "해당 없음",        dataShare: "1GB 데이터쉐어",    condition: "KT 모바일 회선 필수" },
  { id: 5, carrier: "KT",    device: "갤럭시 탭 S10 FE (LTE)",   type: "태블릿",    monthlyFee: 13200, freeEligiblePlan: "해당 없음",         dataShare: "5GB 데이터쉐어",    condition: "KT 모바일 회선 필수",          badge: "인기" },
  { id: 6, carrier: "LGU+",  device: "갤럭시 워치 7 (LTE)",      type: "스마트워치", monthlyFee: 6600,  freeEligiblePlan: "5G 시그니처 이상",  dataShare: "200MB 데이터쉐어",  condition: "가족결합 2회선 이상",          badge: "최저가" },
  { id: 7, carrier: "LGU+",  device: "갤럭시 탭 S10+ (LTE)",     type: "태블릿",    monthlyFee: 16500, freeEligiblePlan: "해당 없음",         dataShare: "10GB 데이터쉐어",   condition: "LGU+ 모바일 회선 필수" },
  { id: 8, carrier: "LGU+",  device: "Apple Watch Ultra 2 (LTE)", type: "스마트워치", monthlyFee: 11000, freeEligiblePlan: "해당 없음",        dataShare: "1GB 데이터쉐어",    condition: "LGU+ 모바일 회선 필수" },
];

const CARRIERS: Carrier[] = ["전체", "SKT", "KT", "LGU+", "알뜰폰"];
const CATEGORIES: Category[] = ["전체", "5G", "LTE", "무제한", "데이터나눔"];

const CARRIER_DOT_COLOR: Record<string, string> = {
  SKT: "#e51e25", KT: "#e87722", "LGU+": "#a50034", 알뜰폰: "var(--color-cyan-400)",
};

const BADGE_CLASS: Record<string, string> = {
  인기: "badge badge-cyan",
  추천: "badge badge-blue",
  최저가: "badge badge-green",
  프리미엄: "badge badge-purple",
  "워치 무료 가능": "badge badge-purple",
  "무료 결합": "badge badge-green",
};

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mobile");
  const [carrierFilter, setCarrierFilter] = useState<Carrier>("전체");
  const [categoryFilter, setCategoryFilter] = useState<Category>("전체");
  const [maxMonthlyPrice, setMaxMonthlyPrice] = useState(150000);
  const [sortOrder, setSortOrder] = useState<"price" | "data">("price");
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<"전체" | "스마트워치" | "태블릿">("전체");

  const filteredMobilePlans = MOBILE_PLANS
    .filter((p) => carrierFilter === "전체" || p.carrier === carrierFilter)
    .filter((p) => categoryFilter === "전체" || p.category === categoryFilter)
    .filter((p) => p.price <= maxMonthlyPrice)
    .sort((a, b) => sortOrder === "price" ? a.price - b.price : a.data.localeCompare(b.data));

  const filteredDevicePlans = DEVICE_PLANS
    .filter((d) => carrierFilter === "전체" || d.carrier === carrierFilter)
    .filter((d) => deviceTypeFilter === "전체" || d.type === deviceTypeFilter);

  const comparePlans = MOBILE_PLANS.filter((p) => compareIds.includes(p.id));

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "text-[var(--bg-root)] font-semibold" : "text-[var(--text-60)] border border-[var(--border-10)] hover:text-[var(--text-main)] hover:border-[var(--border-20)]"}`}
      style={active ? { background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" } : {}}
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-2">요금제 조회</h1>
        <p className="text-[var(--text-50)]">모바일 요금제와 기기결합 플랜을 통신사별로 비교하세요.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-8">
        {([["mobile", "📱 모바일 요금제"], ["device", "⌚ 기기결합 플랜"]] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === t ? "text-[var(--bg-root)] font-semibold" : "text-[var(--text-50)] border border-[var(--border-10)] hover:text-[var(--text-main)] hover:border-[var(--border-20)]"}`}
            style={activeTab === t ? { background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 기기결합 탭 ─────────────────────────── */}
      {activeTab === "device" && (
        <div>
          <div className="card mb-8 space-y-5">
            <div>
              <div className="data-label uppercase tracking-widest mb-2">통신사</div>
              <div className="flex flex-wrap gap-2">
                {(["전체", "SKT", "KT", "LGU+"] as Carrier[]).map((c) => (
                  <FilterButton key={c} active={carrierFilter === c} onClick={() => setCarrierFilter(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>
            <div>
              <div className="data-label uppercase tracking-widest mb-2">기기 유형</div>
              <div className="flex gap-2">
                {(["전체", "스마트워치", "태블릿"] as const).map((t) => (
                  <FilterButton key={t} active={deviceTypeFilter === t} onClick={() => setDeviceTypeFilter(t)}>{t}</FilterButton>
                ))}
              </div>
            </div>
            <div className="data-label">{filteredDevicePlans.length}개 기기결합 플랜 · 약관 조건은 반드시 통신사에서 확인하세요</div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDevicePlans.map((d) => (
              <div key={d.id} className="plan-card hover:border-[var(--color-purple-400)]/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{d.type === "스마트워치" ? "⌚" : "📱"}</span>
                    <span className="text-[var(--text-50)] text-xs">{d.carrier} · {d.type}</span>
                  </div>
                  {d.badge && <span className={BADGE_CLASS[d.badge] ?? "badge badge-muted"}>{d.badge}</span>}
                </div>

                <div>
                  <h3 className="font-display text-[var(--text-main)] font-semibold text-base leading-tight mb-2">{d.device}</h3>
                  <div className={`text-3xl font-bold font-mono ${d.monthlyFee === 0 ? "text-[var(--color-green-500)]" : "gradient-text"}`}>
                    {d.monthlyFee === 0 ? "무료" : `${d.monthlyFee.toLocaleString()}원`}
                    <span className="text-sm font-normal text-[var(--text-40)]" style={{ WebkitTextFillColor: "color-mix(in srgb, var(--text-main) 40%, transparent)" }}>/월</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[["데이터쉐어", d.dataShare], ["무료 적용 요금제", d.freeEligiblePlan], ["결합 조건", d.condition]].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="data-label">{label}</span>
                      <span className="text-[var(--text-70)] text-xs leading-relaxed">{value}</span>
                    </div>
                  ))}
                </div>

                <button className="btn-primary mt-auto w-full !py-2 !text-sm">결합 신청</button>
              </div>
            ))}
          </div>

          {filteredDevicePlans.length === 0 && (
            <div className="text-center py-20 text-[var(--text-30)]">
              <div className="text-4xl mb-4">⌚</div>
              <div>조건에 맞는 기기결합 플랜이 없습니다.</div>
            </div>
          )}
        </div>
      )}

      {/* ── 모바일 요금제 탭 ─────────────────────── */}
      {activeTab === "mobile" && (
        <div>
          {/* 필터 패널 */}
          <div className="card mb-8 space-y-5">
            <div>
              <div className="data-label uppercase tracking-widest mb-2">통신사</div>
              <div className="flex flex-wrap gap-2">
                {CARRIERS.map((c) => (
                  <FilterButton key={c} active={carrierFilter === c} onClick={() => setCarrierFilter(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>

            <div>
              <div className="data-label uppercase tracking-widest mb-2">유형</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <FilterButton key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c}</FilterButton>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="data-label uppercase tracking-widest">최대 요금</div>
                <div className="text-[var(--color-cyan-400)] text-sm font-medium font-mono">{maxMonthlyPrice.toLocaleString()}원 이하</div>
              </div>
              <input type="range" min={10000} max={150000} step={5000} value={maxMonthlyPrice}
                     onChange={(e) => setMaxMonthlyPrice(Number(e.target.value))}
                     className="w-full" style={{ accentColor: "var(--color-cyan-400)" }} />
              <div className="flex justify-between text-xs text-[var(--text-30)] mt-1">
                <span>10,000원</span><span>150,000원</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="data-label">{filteredMobilePlans.length}개 요금제</div>
              <div className="flex gap-2">
                {(["price", "data"] as const).map((s) => (
                  <button key={s} onClick={() => setSortOrder(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === s ? "bg-[var(--bg-10)] text-[var(--text-main)]" : "text-[var(--text-40)] hover:text-[var(--text-70)]"}`}>
                    {s === "price" ? "가격순" : "데이터순"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 비교 배너 */}
          {compareIds.length > 0 && (
            <div className="alert-info mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 !text-sm">
              <span><strong className="text-[var(--color-cyan-400)]">{compareIds.length}개</strong> 요금제 비교 중 (최대 3개)</span>
              <div className="flex gap-2 flex-wrap">
                {comparePlans.map((p) => (
                  <span key={p.id} className="badge badge-muted">{p.carrier} {p.name}</span>
                ))}
                <button onClick={() => setCompareIds([])} className="text-xs text-[var(--color-red-400)] hover:text-red-300 transition-colors">초기화</button>
              </div>
            </div>
          )}

          {/* 요금제 카드 그리드 */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMobilePlans.map((plan) => (
              <div key={plan.id} className={`plan-card ${plan.highlight ? "plan-card-featured" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CARRIER_DOT_COLOR[plan.carrier] }} />
                    <span className="text-[var(--text-50)] text-xs">{plan.carrier}</span>
                  </div>
                  {plan.badge && <span className={BADGE_CLASS[plan.badge] ?? "badge badge-muted"}>{plan.badge}</span>}
                </div>

                <div>
                  <h3 className="font-display text-[var(--text-main)] font-semibold text-lg leading-tight mb-1">{plan.name}</h3>
                  <div className="price-large text-3xl">
                    {plan.price.toLocaleString()}
                    <span className="text-base font-normal text-[var(--text-50)]" style={{ WebkitTextFillColor: "color-mix(in srgb, var(--text-main) 50%, transparent)" }}>원/월</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[["데이터", plan.data], ["통화", plan.call], ["문자", plan.sms], ["속도", plan.speed]].map(([label, value]) => (
                    <div key={label} className="data-row">
                      <span className="data-label">{label}</span>
                      <span className="text-[var(--text-80)] text-sm">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                  <button
                    onClick={() => toggleCompare(plan.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${compareIds.includes(plan.id) ? "bg-[var(--color-cyan-400)]/20 text-[var(--color-cyan-400)] border-[var(--color-cyan-400)]/30" : "border-[var(--border-10)] text-[var(--text-50)] hover:text-[var(--text-main)] hover:border-[var(--border-20)]"}`}
                  >
                    {compareIds.includes(plan.id) ? "비교 중 ✓" : "비교 추가"}
                  </button>
                  <button className="btn-primary flex-1 !py-2 !text-sm !rounded-lg">신청하기</button>
                </div>
              </div>
            ))}
          </div>

          {filteredMobilePlans.length === 0 && (
            <div className="text-center py-20 text-[var(--text-30)]">
              <div className="text-4xl mb-4">🔍</div>
              <div>조건에 맞는 요금제가 없습니다.</div>
            </div>
          )}

          {/* 비교 테이블 */}
          {comparePlans.length >= 2 && (
            <div className="mt-12">
              <h2 className="font-display text-2xl font-bold text-[var(--text-main)] mb-6">요금제 비교</h2>
              <div className="card overflow-x-auto" style={{ padding: 0 }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-5)]">
                      <th className="text-left p-4 data-label font-normal w-28">항목</th>
                      {comparePlans.map((p) => (
                        <th key={p.id} className="p-4 text-center">
                          <div className="font-display text-[var(--text-main)] font-semibold">{p.name}</div>
                          <div className="text-[var(--text-40)] text-xs">{p.carrier}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "월 요금", key: "price", format: (v: string | number) => `${Number(v).toLocaleString()}원` },
                      { label: "데이터",  key: "data",  format: (v: string | number) => String(v) },
                      { label: "통화",   key: "call",  format: (v: string | number) => String(v) },
                      { label: "속도",   key: "speed", format: (v: string | number) => String(v) },
                    ].map(({ label, key, format }) => (
                      <tr key={key} className="border-b border-[var(--border-5)] last:border-0">
                        <td className="p-4 data-label">{label}</td>
                        {comparePlans.map((p) => (
                          <td key={p.id} className="p-4 text-center text-[var(--text-80)]">
                            {format(p[key as keyof MobilePlan] as string | number)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
