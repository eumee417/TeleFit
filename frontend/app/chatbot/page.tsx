"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "bot";
  content: string;
  options?: string[];
  plans?: RecommendedPlan[];
  image?: string;
}

interface RecommendedPlan {
  rank: number;
  carrier: string;
  name: string;
  monthlyTotal: number;
  breakdown: { label: string; amount: number; type: "base" | "discount" | "extra" }[];
  saving: number;
  annualSaving: number;
  discountType: string;
  badge?: string;
  note?: string;
}

interface PipelineStep {
  node: string;
  label: string;
  status: "done" | "active" | "pending";
}

const PIPELINE_NODES = [
  { node: "Router",     label: "요구사항 파싱" },
  { node: "Retriever",  label: "데이터 조회" },
  { node: "Calculator", label: "비용 계산" },
  { node: "Grader",     label: "약관 검증" },
  { node: "Output",     label: "플랜 선정" },
];

const INITIAL_MESSAGE: Message = {
  role: "bot",
  content: "안녕하세요! 저는 텔레핏 AI 에이전트입니다 🤖\n\n가족결합·기기결합(스마트워치·태블릿)·기기 보조금까지 복잡한 조건을 모두 고려해 최적 요금제 조합을 설계해 드립니다.\n\n현재 어떤 상황인지 알려주세요.",
  options: ["가족 결합 요금제 최적화", "스마트워치/태블릿 추가 검토", "기기변경·번호이동 비교", "캡처 이미지로 시작하기"],
};

// [TODO: DB/API 연동 필요]
// 아래 DEMO_PLANS 배열과 CONVERSATION 대화 시나리오는 정적인 Mock 데이터입니다.
// 실제 서비스 시에는 LangGraph나 AI 백엔드 서버(API)와 직접 통신하여 결과값을 받아오도록 연동해야 합니다.
const DEMO_PLANS: RecommendedPlan[] = [
  {
    rank: 1, carrier: "알뜰폰", name: "이야기 무제한 + 워치 데이터쉐어",
    monthlyTotal: 98500,
    breakdown: [
      { label: "모바일 2회선 합산", amount: 44000, type: "base" },
      { label: "스마트워치 회선",   amount: 9900,  type: "base" },
      { label: "가족결합 할인",     amount: -8800, type: "discount" },
      { label: "선택약정 25%",      amount: -11000, type: "discount" },
      { label: "부가세 포함",       amount: 64400, type: "extra" },
    ],
    saving: 43500, annualSaving: 522000, discountType: "선택약정 25%",
    badge: "최적 추천", note: "번호이동(MNP) 필요 · 약관 검증 통과 ✓",
  },
  {
    rank: 2, carrier: "KT", name: "슈퍼플랜 베이직 + 워치 무료결합",
    monthlyTotal: 119000,
    breakdown: [
      { label: "슈퍼플랜 베이직 2회선",  amount: 170000, type: "base" },
      { label: "스마트워치 무료혜택 적용", amount: 0,     type: "extra" },
      { label: "가족결합 할인 (2회선)",   amount: -28000, type: "discount" },
      { label: "선택약정 25%",           amount: -34000, type: "discount" },
    ],
    saving: 23000, annualSaving: 276000, discountType: "선택약정 25%",
    badge: "기존 통신사 유지", note: "번호이동 불필요 · 스마트워치 무료혜택 조건 충족 ✓",
  },
  {
    rank: 3, carrier: "KT", name: "5G Y세대 + 공시지원금",
    monthlyTotal: 134000,
    breakdown: [
      { label: "5G Y세대 2회선",       amount: 138000, type: "base" },
      { label: "스마트워치 회선",       amount: 15400,  type: "base" },
      { label: "공시지원금 단말 할인",  amount: -12500, type: "discount" },
      { label: "가족결합 할인",         amount: -9900,  type: "discount" },
    ],
    saving: 8000, annualSaving: 96000, discountType: "공시지원금",
    note: "기기변경(UPGRADE) · Grader 재계산 1회 후 통과 ✓",
  },
];

const CONVERSATION: Record<string, { content: string; options?: string[] }> = {
  family:  { content: "가족 결합 최적화를 원하시는군요!\n\n현재 가족 구성과 통신사 현황을 알려주세요.", options: ["KT 2회선 결합 중", "SKT 가족결합 사용 중", "통신사 혼합 (각자 다름)", "아직 결합 없음"] },
  watch:   { content: "스마트워치나 태블릿 추가를 검토 중이시군요!\n\n현재 어떤 상황인지 알려주세요.", options: ["KT 가족결합 중, 워치 추가 원함", "SKT 사용 중, 워치 추가 원함", "알뜰폰 사용 중, 워치 추가 원함"] },
  mnp:     { content: "기기변경 또는 번호이동을 검토 중이시군요!\n\n어떤 상황인지 알려주세요.", options: ["같은 통신사 기기변경 (UPGRADE)", "다른 통신사로 번호이동 (MNP)", "공시지원금 vs 선택약정 비교만 원함"] },
  kt2line: { content: "KT 2회선 가족결합 중이시군요. 스마트워치 추가도 검토 중이신가요?", options: ["네, 워치 추가 검토 중", "아니요, 요금 최적화만 원함"] },
  ktwatch: { content: "알겠습니다! 다음 정보를 확인할게요.\n\n• 현재: KT 모바일 2회선 가족결합 중\n• 목표: 스마트워치 회선 추가\n\n현재 요금제 월 납부액이 얼마인가요?", options: ["10~15만원 구간", "15~20만원 구간", "20만원 이상"] },
  analyze: { content: "입력 정보를 바탕으로 AI 에이전트가 분석을 시작합니다.\n\n📋 분석 대상:\n• 기존 KT 결합 유지 + 워치 추가\n• KT 결합 해지 + 알뜰폰 이동\n• 공시지원금 vs 선택약정 경로 비교" },
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [conversationStep, setConversationStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[] | null>(null);
  const [pipelineRetryCount, setPipelineRetryCount] = useState(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, pipelineSteps]);

  const appendBotMessage = useCallback((msg: Omit<Message, "role">, delay = 900) => {
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "bot", ...msg }]);
    }, delay + Math.random() * 400);
  }, []);

  const runPipeline = useCallback((onComplete: () => void) => {
    const initial: PipelineStep[] = PIPELINE_NODES.map((n, i) => ({
      ...n, status: i === 0 ? "active" : "pending",
    }));
    setPipelineSteps(initial);
    setPipelineRetryCount(0);

    let idx = 0;
    const advance = () => {
      idx++;
      if (idx >= PIPELINE_NODES.length) {
        setPipelineSteps(null);
        setPipelineRetryCount(0);
        onComplete();
        return;
      }
      const isGraderNode = idx === 3;
      setPipelineSteps((prev) => prev?.map((s, i) => ({
        ...s,
        status: i < idx ? "done" : i === idx ? "active" : "pending",
      })) ?? null);
      if (isGraderNode) setPipelineRetryCount(1);
      setTimeout(advance, isGraderNode ? 1400 : 900);
    };
    setTimeout(advance, 900);
  }, []);

  const startAnalysis = useCallback(() => {
    runPipeline(() => {
      setMessages((prev) => [...prev, {
        role: "bot",
        content: "✅ 분석 완료! Grader 검증 통과 (재시도 1회)\n\n조건을 만족하는 최적 플랜 3가지입니다. 월 비용 기준 오름차순으로 정렬했습니다.",
        plans: DEMO_PLANS,
      }]);
      setConversationStep(99);
    });
  }, [runPipeline]);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setMessages((prev) => [...prev, { role: "user", content: "가입정보 캡처 이미지를 첨부했습니다.", image: dataUrl }]);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [...prev, {
          role: "bot",
          content: "📋 이미지 분석 완료 (Vision AI)\n\n인식된 가입정보:\n• 통신사: KT\n• 요금제: 슈퍼플랜 베이직 (85,000원)\n• 가족결합: 2회선\n• 이번 달 데이터: 62GB / 완전무제한\n\n⚠️ 이름·전화번호 등 개인정보는 자동 마스킹 처리되었습니다.\n\n추가 검토 사항이 있으신가요?",
          options: ["스마트워치 추가 검토", "요금 최적화만 원함", "직접 AI 분석 시작"],
        }]);
        setConversationStep(3);
      }, 1800);
    };
    reader.readAsDataURL(file);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (content === "다시 시작") {
      setMessages([INITIAL_MESSAGE]);
      setConversationStep(0);
      setInputText("");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInputText("");
    setIsTyping(true);

    if (conversationStep === 0) {
      if (content.includes("가족 결합"))           { appendBotMessage(CONVERSATION.family);  setConversationStep(1); }
      else if (content.includes("스마트워치"))      { appendBotMessage(CONVERSATION.watch);   setConversationStep(1); }
      else if (content.includes("기기변경"))        { appendBotMessage(CONVERSATION.mnp);     setConversationStep(1); }
      else if (content.includes("캡처")) {
        setTimeout(() => { setIsTyping(false); setMessages((p) => [...p, { role: "bot", content: "아래 업로드 영역을 클릭하거나 이미지를 드래그해서 올려주세요.\n\n이름·전화번호 등 개인정보는 자동 마스킹됩니다." }]); }, 900);
        setConversationStep(1);
      }
      else { appendBotMessage(CONVERSATION.family); setConversationStep(1); }
    } else if (conversationStep === 1) {
      if (content.includes("KT 2회선") || content.includes("KT 가족")) { appendBotMessage(CONVERSATION.kt2line); setConversationStep(2); }
      else if (content.includes("KT") || content.includes("SKT") || content.includes("알뜰폰")) { appendBotMessage(CONVERSATION.ktwatch); setConversationStep(2); }
      else { appendBotMessage(CONVERSATION.analyze); setConversationStep(10); setTimeout(startAnalysis, 1400); }
    } else if (conversationStep === 2) {
      if (content.includes("워치") || content.includes("네")) { appendBotMessage(CONVERSATION.ktwatch); setConversationStep(3); }
      else { appendBotMessage(CONVERSATION.analyze); setConversationStep(10); setTimeout(startAnalysis, 1400); }
    } else if (conversationStep === 3) {
      appendBotMessage(CONVERSATION.analyze); setConversationStep(10); setTimeout(startAnalysis, 1400);
    } else {
      appendBotMessage({ content: "추가 질문이 있으시면 말씀해 주세요.\n처음부터 다시 시작하려면 '다시 시작'을 입력하세요." });
    }
  }, [conversationStep, appendBotMessage, startAnalysis]);

  const isPipelineRunning = pipelineSteps !== null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col"
         style={{ height: "calc(100vh - 4rem)" }}>

      <div className="mb-4 flex-shrink-0">
        <h1 className="font-display text-3xl font-bold text-[var(--text-main)] mb-1">AI 결합 설계</h1>
        <p className="text-[var(--text-50)] text-sm">가족결합·기기결합·보조금을 모두 고려한 최적 조합을 설계합니다.</p>
      </div>

      <div className="flex-1 rounded-2xl border border-[var(--border-5)] flex flex-col overflow-hidden"
           style={{ background: "var(--bg-card-solid)", minHeight: 0 }}>

        {/* 채팅 헤더 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-5)]"
             style={{ background: "rgba(34,211,238,0.04)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
               style={{ background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" }}>🤖</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[var(--text-main)] text-sm font-medium">텔레핏 AI 에이전트</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green-400)] animate-pulse" />
              <span className="text-[var(--color-green-400)] text-xs">LangGraph 파이프라인 대기 중</span>
            </div>
          </div>
          {/* 파이프라인 노드 라벨 */}
          <div className="ml-auto hidden sm:flex gap-1.5 flex-shrink-0">
            {PIPELINE_NODES.map((n) => (
              <div key={n.node} className="text-xs px-2 py-0.5 rounded font-mono"
                   style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" }}>
                {n.node}
              </div>
            ))}
          </div>
        </div>

        {/* 메시지 목록 */}
        <div
          ref={messageListRef}
          className={`flex-1 overflow-y-auto p-5 space-y-4 transition-opacity ${isDraggingFile ? "opacity-50" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => { e.preventDefault(); setIsDraggingFile(false); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                       style={{ background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" }}>🤖</div>
                )}

                {/* 첨부 이미지 */}
                {msg.image && (
                  <div className="rounded-xl overflow-hidden border border-[var(--border-10)]">
                    <img src={msg.image} alt="첨부 이미지" className="max-w-full max-h-44 object-cover" />
                  </div>
                )}

                {/* 말풍선 */}
                <div className={msg.role === "bot" ? "chat-bubble-bot" : "chat-bubble-user"}>
                  {msg.content}
                </div>

                {/* 빠른 선택 버튼 */}
                {msg.options && i === messages.length - 1 && !isTyping && !isPipelineRunning && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.options.map((opt) => (
                      <button key={opt} onClick={() => sendMessage(opt)} className="reply-chip">{opt}</button>
                    ))}
                  </div>
                )}

                {/* 추천 플랜 카드 */}
                {msg.plans && (
                  <div className="space-y-3 w-full mt-1">
                    {msg.plans.map((plan) => (
                      <div key={plan.rank} className={plan.rank === 1 ? "card-highlight" : "card"} style={{ padding: "1.25rem" }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`badge ${plan.rank === 1 ? "badge-cyan" : "badge-muted"} font-mono`}>
                                #{plan.rank}
                              </span>
                              {plan.badge && <span className="badge badge-cyan">{plan.badge}</span>}
                              <span className="text-[var(--text-30)] text-xs">{plan.carrier}</span>
                            </div>
                            <div className="font-display text-[var(--text-main)] font-semibold text-sm">{plan.name}</div>
                            {plan.note && <div className="text-[var(--text-35)] text-xs mt-0.5">{plan.note}</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="price-large text-xl">{plan.monthlyTotal.toLocaleString()}원</div>
                            <div className="text-[var(--text-30)] text-xs">/ 월</div>
                          </div>
                        </div>

                        {/* 비용 내역 */}
                        <div className="space-y-1 mb-3 pt-3 border-t border-[var(--border-5)]">
                          {plan.breakdown.map((b) => (
                            <div key={b.label} className="data-row text-xs">
                              <span className="text-[var(--text-40)]">{b.label}</span>
                              <span className={`font-mono font-medium ${b.type === "discount" ? "text-[var(--color-green-400)]" : b.type === "extra" ? "text-[var(--color-cyan-400)]" : "text-[var(--text-60)]"}`}>
                                {b.type === "discount" ? `-${Math.abs(b.amount).toLocaleString()}원` : `${b.amount.toLocaleString()}원`}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[var(--color-green-400)] text-xs font-medium">월 {plan.saving.toLocaleString()}원 절약</div>
                            <div className="text-[var(--text-30)] text-xs">연 {plan.annualSaving.toLocaleString()}원</div>
                          </div>
                          <div className="badge badge-muted font-mono">{plan.discountType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 파이프라인 진행 표시 */}
          {pipelineSteps && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mb-2"
                     style={{ background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" }}>🤖</div>
                <div className="chat-bubble-bot">
                  <div className="font-mono text-[var(--text-50)] text-xs mb-3">
                    LangGraph 파이프라인 실행 중...
                    {pipelineRetryCount > 0 && (
                      <span className="ml-2 text-[var(--color-purple-400)]">Grader 재검증 중 (Self-Correction)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {pipelineSteps.map((s, i) => {
                      const nodeClass =
                        s.status === "done"   ? "pipeline-node pipeline-node-done" :
                        s.status === "active" && s.node === "Grader" ? "pipeline-node pipeline-node-grader" :
                        s.status === "active" ? "pipeline-node pipeline-node-active" :
                        "pipeline-node pipeline-node-idle";
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className={nodeClass}>
                            {s.status === "done"   ? "✓" :
                             s.status === "active" ? <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> :
                             "○"}
                            <span>{s.node}</span>
                          </div>
                          {i < pipelineSteps.length - 1 && <span className="text-[var(--text-15)] text-xs">→</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="chat-bubble-bot flex items-center gap-1 !py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan-400)] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-[var(--border-5)] p-4">
          {/* 이미지 업로드 드롭존 */}
          <div
            className={`upload-zone mb-3 ${isDraggingFile ? "upload-zone-active" : ""}`}
            onClick={() => filePickerRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingFile(false); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                 style={{ background: "rgba(34,211,238,0.1)", color: "var(--color-cyan-400)" }}>📷</div>
            <div className="flex-1 min-w-0">
              <div className="text-[var(--text-60)] text-xs font-medium">가입정보 캡처 업로드</div>
              <div className="text-[var(--text-25)] text-xs">청구서·가입안내 화면을 올리면 요금제를 자동 인식합니다 (PII 자동 마스킹)</div>
            </div>
            <div className="text-[var(--text-20)] text-xs flex-shrink-0 hidden sm:block">클릭 또는 드래그</div>
            <input
              ref={filePickerRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
            />
          </div>

          {/* 텍스트 입력 */}
          <form onSubmit={(e) => { e.preventDefault(); if (inputText.trim()) sendMessage(inputText.trim()); }}
                className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={conversationStep === 99
                ? "'다시 시작' 입력 또는 추가 질문"
                : "상황을 자유롭게 입력하세요 (예: 가족 3명 KT 사용 중, 워치 추가 원함)"}
              className="input-field flex-1"
              disabled={isPipelineRunning}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping || isPipelineRunning}
              className="btn-primary !px-4 !py-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <p className="text-center mt-2 text-xs text-[var(--text-20)]">
            빠른 선택 버튼 또는 자연어로 직접 입력 · '다시 시작'으로 초기화
          </p>
        </div>
      </div>
    </div>
  );
}
