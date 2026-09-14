import Link from "next/link";

const FEATURES = [
  { icon: "📷", title: "청구서 한 장으로 요금 진단", desc: "사용 중인 통신사 앱 청구서만 캡처해서 올려주세요. 현재 요금과 데이터 사용량을 자동으로 분석해 드립니다." },
  { icon: "🔗", title: "복잡한 가족 결합도 알아서", desc: "가족 수, 인터넷, 스마트워치까지 얽혀있는 결합 할인을 빠짐없이 찾아내 가장 저렴한 조합을 만들어 드립니다." },
  { icon: "🧮", title: "숨은 할인까지 꼼꼼한 계산", desc: "공시지원금과 선택약정 중 어느 쪽이 더 유리한지 24개월 기준으로 정확하게 계산해서 비교해 드립니다." },
  { icon: "✅", title: "광고 없는 객관적인 추천", desc: "통신사 제휴 광고나 특정 요금제 유도 없이, 오직 고객님께 가장 유리한 최적의 요금제만 골라드립니다." },
];

const HOW_IT_WORKS = [
  { step: "01", label: "청구서 업로드", desc: "현재 내고 있는 통신 요금과 사용량을 확인합니다." },
  { step: "02", label: "결합 정보 입력", desc: "가족 구성원과 사용하는 기기(워치/패드)를 알려주세요." },
  { step: "03", label: "맞춤 요금제 추천", desc: "복잡한 조건을 분석해 가장 저렴한 요금제 3가지를 보여드립니다." },
];

const DEMO_SCENARIO = {
  situation: "가족 2명이 KT 모바일 결합 중, 아버지가 새 스마트워치 회선 추가를 검토",
  options: [
    { label: "기존 결합 유지 + 워치 추가", price: "월 142,000원", badge: "현재 요금", highlight: false },
    { label: "텔레핏 맞춤 설계 + 알뜰폰 이동",    price: "월 98,500원",  badge: "추천 ✓",   highlight: true  },
  ],
  saving: "월 43,500원 · 연 522,000원 절약",
};

const COMPARISON_TABLE = [
  { feature: "가족·기기 결합 할인 자동 계산",    telefit: true,  others: false, note: "복잡한 결합 할인을 모두 반영해 실제 납부 금액을 보여줍니다." },
  { feature: "청구서 자동 인식",                 telefit: true, others: false, note: "캡처 이미지 한 장으로 현재 요금제를 간편하게 파악합니다." },
  { feature: "공시지원금 vs 선택약정 정밀 비교", telefit: true,  others: false, note: "24개월 총 비용을 기준으로 어떤 선택이 유리한지 계산합니다." },
  { feature: "광고 없는 객관적 추천",            telefit: true,  others: false, note: "통신사 제휴 없이 오직 고객 중심의 추천만 제공합니다." },
  { feature: "다양한 통신사/알뜰폰 요금제 비교", telefit: true,  others: true,  note: "국내 3사 통신사부터 알뜰폰까지 폭넓은 요금제를 다룹니다." },
];

const STATS = [
  { value: "1분",     label: "맞춤 요금제 분석 시간" },
  { value: "35,000원", label: "매월 평균 통신비 절약액" },
  { value: "100%",    label: "광고 없는 순수 추천" },
  { value: "3,000+",  label: "비교 가능한 요금제" },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── 히어로 ─────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-24 text-center overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 blur-3xl"
               style={{ background: "radial-gradient(ellipse, var(--color-cyan-400) 0%, #3b82f6 50%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-10 blur-3xl"
               style={{ background: "radial-gradient(ellipse, #3b82f6, transparent 70%)" }} />
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="bg-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--color-cyan-400)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg-grid)" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="eyebrow mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan-400)] animate-pulse inline-block mr-2" />
            나에게 딱 맞는 통신비 최적화 서비스
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[var(--text-main)] mb-6 leading-tight tracking-tight font-display">
            가족결합 · 기기결합,
            <br />
            <span className="gradient-text">나만의 맞춤 요금제</span>
            <br />
            찾아드립니다
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-60)] max-w-2xl mx-auto mb-10 leading-relaxed">
            복잡한 요금제와 숨겨진 결합 할인, 공시지원금까지!
            어렵고 번거로운 계산은 텔레핏에 맡겨주세요.{" "}
            <strong className="text-[var(--text-80)]">당신에게 가장 유리한 최적의 플랜</strong>을 찾아드립니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chatbot" className="btn-primary"
              style={{ boxShadow: "0 0 30px rgba(34,211,238,0.3)" }}>
              내 맞춤 요금제 추천받기 →
            </Link>
            <Link href="/calculator" className="btn-ghost">
              비용 직접 계산해보기
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-[var(--text-20)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── 통계 배너 ──────────────────────────────── */}
      <section className="py-12 border-y border-[var(--border-5)] relative overflow-hidden" style={{ background: `linear-gradient(90deg, rgba(34, 211, 238, 0.03), color-mix(in srgb, var(--bg-root) 80%, transparent), rgba(59, 130, 246, 0.03))` }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ background: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iI2NjdjQ5YSIvPjwvc3ZnPg==') repeat" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="stat-value text-3xl sm:text-4xl mb-1">{s.value}</div>
                <div className="text-sm text-[var(--text-50)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 핵심 기능 ──────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-heading text-3xl sm:text-4xl mb-4">왜 텔레핏인가요?</h2>
            <p className="text-[var(--text-50)] max-w-xl mx-auto">
              단순히 요금제 목록만 보여주는 것이 아니라, 고객님의 가족 현황과 사용하는 기기에 맞춰 진짜 필요한 할인 혜택을 꼼꼼하게 찾아드립니다.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:border-[var(--color-cyan-400)]/20 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-[var(--text-main)] font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-[var(--text-50)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 이용 방법 ────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at bottom, rgba(34, 211, 238, 0.05) 0%, transparent 70%)" }}>
        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none transition-colors" style={{ backgroundColor: "color-mix(in srgb, var(--bg-root) 50%, transparent)" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="eyebrow mb-4">이용 방법</div>
            <h2 className="section-heading text-3xl sm:text-4xl mb-4">
              단 3단계로 끝나는
              <br />간편한 맞춤 요금 설계
            </h2>
            <p className="text-[var(--text-40)] text-sm max-w-lg mx-auto">
              어려운 용어를 몰라도, 통신사를 잘 몰라도 누구나 쉽게 이용할 수 있습니다.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px opacity-30"
                 style={{ background: "linear-gradient(90deg, var(--color-cyan-400), #3b82f6)" }} />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative card bg-transparent border-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 font-display text-lg font-bold relative z-10"
                  style={{
                    background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.1))",
                    border: "1px solid rgba(34,211,238,0.25)",
                    color: "var(--color-cyan-400)",
                  }}
                >
                  {step.step}
                </div>
                <h3 className="font-display text-[var(--text-main)] font-semibold text-lg mb-3">{step.label}</h3>
                <p className="text-[var(--text-50)] text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/chatbot" className="btn-primary">
              내 요금제 진단해보기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 데모 시나리오 ──────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="eyebrow mb-4">데모 시나리오</div>
            <h2 className="section-heading text-3xl sm:text-4xl mb-4">
              이런 복잡한 상황도
              <br />AI가 해결합니다
            </h2>
          </div>

          <div className="card space-y-8">
            <div className="flex items-start gap-4 pb-8 border-b border-[var(--border-5)]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                   style={{ background: "rgba(34,211,238,0.1)" }}>👨‍👩‍👦</div>
              <div>
                <div className="font-display text-[var(--text-main)] font-medium mb-1">상황</div>
                <p className="text-[var(--text-60)] text-sm leading-relaxed">{DEMO_SCENARIO.situation}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {DEMO_SCENARIO.options.map((opt) => (
                <div key={opt.label} className={opt.highlight ? "card-highlight" : "card"}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[var(--text-50)] text-xs">{opt.label}</div>
                    <span className={opt.highlight ? "badge badge-cyan" : "badge badge-muted"}>{opt.badge}</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${opt.highlight ? "gradient-text" : "text-[var(--text-40)]"}`}>
                    {opt.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="alert-info text-center font-semibold font-mono">
              💡 {DEMO_SCENARIO.saving}
            </div>
          </div>
        </div>
      </section>

      {/* ── 경쟁사 비교 ───────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 60%)" }}>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="eyebrow mb-4">서비스 비교</div>
            <h2 className="section-heading text-3xl sm:text-4xl mb-4">
              기존 비교 사이트와
              <br />
              <span className="gradient-text">무엇이 다른가요?</span>
            </h2>
            <p className="text-[var(--text-40)] max-w-lg mx-auto text-sm">
              단순히 요금을 나열하는 것을 넘어, 고객님의 상황에 맞는 복잡한 조건들을 모두 계산해 가장 똑똑하게 추천합니다.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-[var(--border-5)] overflow-hidden" style={{ background: "color-mix(in srgb, var(--text-main) 2%, transparent)" }}>
            {/* 헤더 */}
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_120px] border-b border-[var(--border-5)] px-6 py-4"
                 style={{ background: "color-mix(in srgb, var(--text-main) 3%, transparent)" }}>
              <div className="data-label uppercase tracking-widest">기능</div>
              <div className="text-center">
                <span className="btn-primary !px-3 !py-1 !text-sm !rounded-lg">텔레핏</span>
              </div>
              <div className="text-center text-[var(--text-40)] text-sm font-medium">타 사이트</div>
            </div>

            {COMPARISON_TABLE.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_120px] px-6 py-5 border-b border-[var(--border-5)] last:border-0 hover:bg-[var(--bg-02)] transition-colors">
                <div className="pr-4">
                  <div className="text-[var(--text-main)] text-sm font-medium mb-1">{row.feature}</div>
                  <div className="text-[var(--text-40)] text-xs leading-relaxed">{row.note}</div>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: "rgba(34,211,238,0.15)", color: "#0891b2" }}>✓</span>
                </div>
                <div className="flex items-center justify-center">
                  {row.others
                    ? <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-[var(--text-40)]" style={{ background: "color-mix(in srgb, var(--text-main) 5%, transparent)" }}>✓</span>
                    : <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-red-500/60" style={{ background: "rgba(248,113,113,0.1)" }}>✕</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto card-highlight text-center relative overflow-hidden"
             style={{ padding: "3rem", border: "1px solid rgba(34,211,238,0.15)" }}>
          <div className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
               style={{ background: "radial-gradient(ellipse at center, var(--color-cyan-400), transparent 70%)" }} />
          <div className="relative">
            <h2 className="section-heading text-3xl sm:text-4xl mb-4">지금 바로 최적 결합을 설계하세요</h2>
            <p className="text-[var(--text-50)] mb-8 max-w-lg mx-auto">
              캡처 이미지 업로드 또는 자연어 입력으로 2분 안에 맞춤 결합 플랜 3가지를 받을 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/chatbot" className="btn-primary">내 맞춤 요금제 추천받기</Link>
              <Link href="/calculator" className="btn-ghost">비용 직접 계산하기</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
