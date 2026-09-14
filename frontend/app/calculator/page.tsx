"use client";

import { useState, useMemo, useEffect } from "react";
import { fetchPlans, fetchDevices, fetchMnpBonus } from "@/lib/calculatorApi";
import type { PlanOption, DeviceOption } from "@/lib/calculatorApi";

type DiscountMode = "선택약정" | "공시지원금";
type TransferType = "UPGRADE" | "MNP";

const VAT = 1.1;

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="font-display text-[var(--text-main)] font-semibold text-lg mb-1">{title}</h2>
      {subtitle && <p className="data-label mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

export default function CalculatorPage() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [mnpBonusAmount, setMnpBonusAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("선택약정");
  const [transferType, setTransferType] = useState<TransferType>("UPGRADE");
  const [familyLines, setFamilyLines] = useState(2);
  const [addWatch, setAddWatch] = useState(false);
  const [watchPlan, setWatchPlan] = useState(11000);
  const [dataUsed, setDataUsed] = useState(60);
  const [months, setMonths] = useState(24);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchPlans(), fetchDevices(), fetchMnpBonus()])
      .then(([planData, deviceData, mnpData]) => {
        if (cancelled) return;
        setPlans(planData);
        setDevices(deviceData);
        setMnpBonusAmount(mnpData.amount);
        setSelectedPlan(planData[2] ?? planData[0] ?? null);
        setSelectedDeviceId(deviceData[2]?.id ?? deviceData[0]?.id ?? null);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;
  const devicePrice = selectedDevice?.retailPrice ?? 0;
  const subsidy = selectedDevice?.subsidy ?? 0;

  const calc = useMemo(() => {
    const base = selectedPlan?.basePrice ?? 0;
    const contractDiscount = discountMode === "선택약정" ? Math.floor(base * 0.25) : 0;
    const familyDiscount = familyLines >= 2 ? Math.floor(base * 0.1 * Math.min(familyLines - 1, 3)) : 0;
    const mnpBonus = transferType === "MNP" ? mnpBonusAmount : 0;
    const monthlyPhone = Math.floor((base - contractDiscount - familyDiscount) * VAT);
    const watchFree = addWatch && (selectedPlan?.watchFreeEligible ?? false);
    const monthlyWatch = addWatch ? (watchFree ? 0 : Math.floor(watchPlan * VAT)) : 0;
    const monthly = monthlyPhone + monthlyWatch;
    const deviceAfterSubsidy = discountMode === "공시지원금"
      ? devicePrice - subsidy - mnpBonus
      : devicePrice - mnpBonus;
    const total24_약정 = Math.floor((base - Math.floor(base * 0.25) - familyDiscount) * VAT * months + devicePrice);
    const total24_공시 = Math.floor((base - familyDiscount) * VAT * months + devicePrice - subsidy - mnpBonus);
    const betterMode: DiscountMode = total24_약정 <= total24_공시 ? "선택약정" : "공시지원금";
    const saving24 = Math.abs(total24_약정 - total24_공시);
    return {
      base, contractDiscount, familyDiscount, mnpBonus,
      monthlyPhone, monthlyWatch, watchFree, monthly,
      deviceAfterSubsidy, total24_약정, total24_공시, betterMode, saving24,
      total24: discountMode === "선택약정" ? total24_약정 : total24_공시,
    };
  }, [selectedPlan, discountMode, transferType, familyLines, addWatch, watchPlan,
      devicePrice, subsidy, months, mnpBonusAmount]);

  const dataOverage = dataUsed > (selectedPlan?.dataGB ?? 999) && (selectedPlan?.dataGB ?? 999) < 999;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-2">비용 계산기</h1>
        <p className="text-[var(--text-50)]">공시지원금 vs 선택약정, 번호이동 보너스, 가족결합 할인을 한번에 계산합니다.</p>
      </div>

      {error && (
        <div className="alert-warn mb-6 flex items-center gap-2">
          <span>⚠</span> {error} — 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-8">

        {/* ── 왼쪽 입력 패널 ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* 1. 가입 유형 */}
          <SectionCard title="가입 유형">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["UPGRADE", "MNP"] as TransferType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTransferType(t)}
                  className={`p-4 rounded-xl border text-left transition-all ${transferType === t ? "border-[var(--color-cyan-400)]/40 bg-[var(--color-cyan-400)]/[0.07]" : "border-[var(--border-5)] bg-[var(--bg-02)] hover:border-[var(--border-10)]"}`}
                >
                  <div className="font-display text-[var(--text-main)] font-semibold text-sm mb-1">
                    {t === "UPGRADE" ? "기기변경 (UPGRADE)" : "번호이동 (MNP)"}
                  </div>
                  <div className="data-label">
                    {t === "UPGRADE" ? "현재 통신사 유지" : `전환지원금 +${mnpBonusAmount.toLocaleString()}원`}
                  </div>
                </button>
              ))}
            </div>
            {transferType === "MNP" && (
              <div className="alert-success">
                ✓ 번호이동 전환지원금 {mnpBonusAmount.toLocaleString()}원 자동 반영
              </div>
            )}
          </SectionCard>

          {/* 2. 단말 할인 방식 */}
          <SectionCard title="단말 할인 방식" subtitle="24개월 총비용 기준으로 유리한 방식을 자동으로 표시합니다.">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(["선택약정", "공시지원금"] as DiscountMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setDiscountMode(m)}
                  className={`p-4 rounded-xl border text-left transition-all relative ${discountMode === m ? "border-[var(--color-cyan-400)]/40 bg-[var(--color-cyan-400)]/[0.07]" : "border-[var(--border-5)] bg-[var(--bg-02)] hover:border-[var(--border-10)]"}`}
                >
                  {calc.betterMode === m && (
                    <span className="absolute top-2 right-2 badge badge-green">유리</span>
                  )}
                  <div className="font-display text-[var(--text-main)] font-semibold text-sm mb-1">{m}</div>
                  <div className="data-label">
                    {m === "선택약정" ? "매월 요금의 25% 할인" : `단말기 ${subsidy.toLocaleString()}원 즉시 할인`}
                  </div>
                  <div className="price-large text-sm mt-2">
                    24개월 총 {(m === "선택약정" ? calc.total24_약정 : calc.total24_공시).toLocaleString()}원
                  </div>
                </button>
              ))}
            </div>
            {calc.saving24 > 0 && (
              <div className="alert-info">
                💡 <strong>{calc.betterMode}</strong>이 24개월 기준 <strong>{calc.saving24.toLocaleString()}원</strong> 더 유리합니다
              </div>
            )}
          </SectionCard>

          {/* 3. 단말기 선택 */}
          <SectionCard title="단말기 선택">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <select
                  value={selectedDeviceId ?? ""}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  className="input-field mb-3"
                  style={{ appearance: "auto" }}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: "var(--bg-card-solid)" }}>
                      {d.name} — {d.retailPrice.toLocaleString()}원
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="card" style={{ padding: "0.75rem" }}>
                    <div className="data-label mb-1">출고가</div>
                    <div className="font-mono text-[var(--text-main)] font-bold">{devicePrice.toLocaleString()}원</div>
                  </div>
                  <div className="card-highlight" style={{ padding: "0.75rem" }}>
                    <div className="data-label mb-1">공시지원금</div>
                    <div className="font-mono text-[var(--color-cyan-400)] font-bold">-{subsidy.toLocaleString()}원</div>
                  </div>
                </div>

                <div>
                  <div className="data-row mb-2">
                    <span className="text-[var(--text-60)] text-sm">할부 개월</span>
                    <span className="font-mono text-[var(--color-cyan-400)] font-bold">{months}개월</span>
                  </div>
                  <input type="range" min={12} max={36} step={12} value={months}
                         onChange={(e) => setMonths(Number(e.target.value))}
                         className="w-full" style={{ accentColor: "var(--color-cyan-400)" }} />
                  <div className="flex justify-between data-label mt-1"><span>12개월</span><span>24개월</span><span>36개월</span></div>
                </div>
              </>
            )}
          </SectionCard>

          {/* 4. 요금제 선택 */}
          <SectionCard title="요금제 선택">
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {plans.map((plan) => {
                  const active = selectedPlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-4 rounded-xl border text-left transition-all relative ${active ? "border-[var(--color-cyan-400)]/40 bg-[var(--color-cyan-400)]/[0.07]" : "border-[var(--border-5)] bg-[var(--bg-02)] hover:border-[var(--border-10)]"}`}
                    >
                      {plan.watchFreeEligible && (
                        <span className="absolute top-2 right-2 badge badge-purple">워치 무료</span>
                      )}
                      <div className="data-label mb-0.5">{plan.carrier}</div>
                      <div className="font-display text-[var(--text-main)] text-sm font-medium pr-12">{plan.name}</div>
                      <div className="price-large text-sm mt-1">{plan.basePrice.toLocaleString()}원</div>
                      <div className="data-label mt-0.5">{plan.data}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* 5. 가족결합 & 스마트워치 */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-display text-[var(--text-main)] font-semibold mb-4">가족 결합 회선</h3>
              <div className="flex items-center justify-center gap-6 my-3">
                <button onClick={() => setFamilyLines(Math.max(1, familyLines - 1))}
                        className="w-10 h-10 rounded-full border border-[var(--border-10)] text-[var(--text-60)] hover:text-[var(--text-main)] hover:border-[var(--border-20)] transition-all text-xl">−</button>
                <div className="text-center">
                  <div className="font-mono text-4xl font-bold text-[var(--text-main)]">{familyLines}</div>
                  <div className="data-label mt-1">회선</div>
                </div>
                <button onClick={() => setFamilyLines(Math.min(6, familyLines + 1))}
                        className="w-10 h-10 rounded-full border border-[var(--border-10)] text-[var(--text-60)] hover:text-[var(--text-main)] hover:border-[var(--border-20)] transition-all text-xl">+</button>
              </div>
              {familyLines >= 2 && (
                <div className="alert-success text-center">
                  가족결합 할인 -{calc.familyDiscount.toLocaleString()}원/월
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-display text-[var(--text-main)] font-semibold mb-4">스마트워치 추가</h3>
              <button
                onClick={() => setAddWatch(!addWatch)}
                className={`w-full py-3 rounded-xl text-sm font-medium border transition-all mb-3 ${addWatch ? "border-[var(--color-purple-400)]/30 text-[var(--color-purple-400)] bg-purple-400/[0.08]" : "border-[var(--border-10)] text-[var(--text-50)] hover:text-[var(--text-main)] hover:border-[var(--border-20)]"}`}
              >
                {addWatch ? "✓ 스마트워치 추가" : "스마트워치 추가하기"}
              </button>
              {addWatch && (
                <div className="space-y-2">
                  {selectedPlan?.watchFreeEligible ? (
                    <div className="alert-purple">🎁 현재 요금제 워치 무료혜택 적용 가능!</div>
                  ) : (
                    <>
                      <div className="data-label mb-2">워치 데이터쉐어링 요금</div>
                      {[6600, 8800, 11000].map((p) => (
                        <button
                          key={p}
                          onClick={() => setWatchPlan(p)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${watchPlan === p ? "border-[var(--color-cyan-400)]/30 text-[var(--color-cyan-400)] bg-[var(--color-cyan-400)]/[0.06]" : "border-[var(--border-5)] text-[var(--text-50)] hover:text-[var(--text-main)]"}`}
                        >
                          {p.toLocaleString()}원/월 ({p === 6600 ? "200MB" : p === 8800 ? "1GB" : "무제한"})
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. 데이터 사용량 */}
          <div className="card">
            <div className="data-row mb-3">
              <span className="text-[var(--text-60)] text-sm">월 데이터 사용량</span>
              <span className={`font-mono font-bold text-lg ${dataOverage ? "text-[var(--color-red-400)]" : "text-[var(--color-cyan-400)]"}`}>
                {dataUsed} GB
              </span>
            </div>
            <input type="range" min={0} max={200} step={5} value={dataUsed}
                   onChange={(e) => setDataUsed(Number(e.target.value))}
                   className="w-full" style={{ accentColor: dataOverage ? "#f87171" : "var(--color-cyan-400)" }} />
            <div className="flex justify-between data-label mt-1"><span>0 GB</span><span>200 GB</span></div>
            {dataOverage && (
              <div className="alert-warn mt-2">
                ⚠ 데이터 초과 ({dataUsed - (selectedPlan?.dataGB ?? 0)}GB) — 더 높은 요금제를 권장합니다.
              </div>
            )}
          </div>
        </div>

        {/* ── 결과 패널 ── */}
        <div className="lg:col-span-2">
          <div className="card-result sticky top-24 space-y-5">

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div>
                  <div className="data-label mb-1">예상 월 통신 요금</div>
                  <div className="price-large text-5xl">{calc.monthly.toLocaleString()}</div>
                  <div className="text-[var(--text-30)] text-sm">원/월 (VAT 포함)</div>
                </div>

                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full text-sm text-[var(--text-40)] hover:text-[var(--text-70)] flex items-center justify-between transition-colors"
                >
                  <span>요금 상세 내역</span>
                  <svg className={`w-4 h-4 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showBreakdown && (
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "기본 요금",           val: calc.base,            color: "text-[var(--text-70)]",   sign: "+" },
                      { label: "선택약정 25%",         val: calc.contractDiscount, color: "text-[var(--color-green-400)]",  sign: "-", hide: discountMode !== "선택약정" },
                      { label: `가족결합 (${familyLines}회선)`, val: calc.familyDiscount, color: "text-[var(--color-green-400)]", sign: "-", hide: familyLines < 2 },
                      { label: "스마트워치 요금",       val: calc.monthlyWatch,    color: "text-[var(--text-60)]",   sign: "+", hide: !addWatch || calc.watchFree },
                      { label: "스마트워치 무료혜택",   val: 0, color: "text-[var(--color-purple-400)]", sign: "", label2: "무료 ✓", hide: !addWatch || !calc.watchFree },
                      { label: "부가세 (10% 포함)",    val: 0, color: "text-[var(--text-30)]",  sign: "", label2: "포함됨" },
                    ].filter((r) => !r.hide).map(({ label, val, color, sign, label2 }) => (
                      <div key={label} className="data-row">
                        <span className="text-[var(--text-40)]">{label}</span>
                        <span className={`${color} font-medium font-mono`}>
                          {label2 ?? `${sign}${val.toLocaleString()}원`}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-[var(--border-10)] pt-2 data-row font-semibold">
                      <span className="text-[var(--text-70)]">월 합계 (VAT 포함)</span>
                      <span className="text-[var(--text-main)] font-mono">{calc.monthly.toLocaleString()}원</span>
                    </div>
                  </div>
                )}

                {/* 총비용 박스 */}
                <div className="card space-y-3">
                  <div className="data-label uppercase tracking-widest">단말 포함 {months}개월 총비용</div>
                  {[
                    { label: `통신 요금 (${months}개월)`, val: `${(calc.monthly * months).toLocaleString()}원`, color: "text-[var(--text-main)]" },
                    { label: `단말기 (${discountMode === "공시지원금" ? `공시 -${subsidy.toLocaleString()}원 후` : "선택약정"})`, val: `${calc.deviceAfterSubsidy.toLocaleString()}원`, color: "text-[var(--text-main)]" },
                    ...(transferType === "MNP" ? [{ label: "번호이동 전환지원금", val: `-${mnpBonusAmount.toLocaleString()}원`, color: "text-[var(--color-green-400)]" }] : []),
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="data-label mb-0.5">{label}</div>
                      <div className={`font-mono font-bold ${color}`}>{val}</div>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border-10)] pt-2">
                    <div className="data-label mb-1">총 합계</div>
                    <div className="price-large text-2xl">{calc.total24.toLocaleString()}원</div>
                  </div>
                </div>

                {/* AI 분석 결과 */}
                <div className="alert-info">
                  <div className="font-mono font-medium mb-2">✓ Calculator Tool 분석 결과</div>
                  <div className="text-[var(--text-70)] text-sm">
                    <strong className="text-[var(--color-cyan-400)]">{calc.betterMode}</strong>이 {months}개월 기준{" "}
                    <strong className="text-[var(--text-main)]">{calc.saving24.toLocaleString()}원</strong> 더 유리합니다.
                  </div>
                  {transferType === "MNP" && (
                    <div className="text-[var(--color-green-400)]/80 text-xs mt-2">
                      + 번호이동 시 전환지원금 {mnpBonusAmount.toLocaleString()}원 추가 혜택
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
