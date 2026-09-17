"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  startRecommend,
  pollRecommendJob,
  type RecommendCard,
} from "@/lib/recommendApi";

interface Message {
  role: "user" | "bot";
  content: string;
  options?: string[];
  cards?: RecommendCard[];
  image?: string;
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
const GRADER_NODE_INDEX = 3;
const PIPELINE_STEP_INTERVAL_MS = 1100;

const INITIAL_MESSAGE: Message = {
  role: "bot",
  content: "안녕하세요! 저는 텔레핏 AI 에이전트입니다 🤖\n\n가족결합·기기결합(스마트워치·태블릿)·기기 보조금까지 복잡한 조건을 모두 고려해 최적 요금제 조합을 설계해 드립니다.\n\n현재 어떤 상황인지 알려주세요.",
  options: ["가족 결합 요금제 최적화", "스마트워치/태블릿 추가 검토", "기기변경·번호이동 비교", "캡처 이미지로 시작하기"],
};

function formatWon(n: number | null): string {
  return n === null ? "-" : `${n.toLocaleString()}원`;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[] | null>(null);
  const [pipelineRetryCount, setPipelineRetryCount] = useState(0);
  const priorRequirementsRef = useRef<Record<string, unknown> | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isRequesting, pipelineSteps]);

  // 백엔드는 노드별 진행 상태를 안 내려주기 때문에, 요청이 진행되는 동안
  // 5단계 파이프라인을 시간 기반으로 순서대로 훑어주는 연출용 애니메이션.
  // 실제 결과가 오면 애니메이션이 어디까지 갔든 즉시 정리한다.
  const startPipelineAnimation = useCallback((): (() => void) => {
    setPipelineSteps(PIPELINE_NODES.map((n, i) => ({ ...n, status: i === 0 ? "active" : "pending" })));
    setPipelineRetryCount(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, PIPELINE_NODES.length - 1);
      setPipelineSteps((prev) => prev?.map((s, i) => ({
        ...s,
        status: i < idx ? "done" : i === idx ? "active" : "pending",
      })) ?? null);
      if (idx === GRADER_NODE_INDEX) setPipelineRetryCount(1);
    }, PIPELINE_STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setMessages((prev) => [...prev, { role: "user", content: "가입정보 캡처 이미지를 첨부했습니다.", image: dataUrl }]);
      // [TODO: DB/API 연동 필요] 이미지 인식(Vision) 백엔드 엔드포인트가 아직 없어서 Mock 응답 유지.
      setIsRequesting(true);
      setTimeout(() => {
        setIsRequesting(false);
        setMessages((prev) => [...prev, {
          role: "bot",
          content: "📋 이미지 분석은 아직 준비 중입니다.\n\n지금은 텍스트로 상황을 알려주시면 AI가 바로 분석해 드려요. (예: \"SKT 5만원대 요금제 알려줘\")",
        }]);
      }, 1200);
    };
    reader.readAsDataURL(file);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (content === "다시 시작") {
      setMessages([INITIAL_MESSAGE]);
      priorRequirementsRef.current = null;
      setInputText("");
      return;
    }
    if (content === "캡처 이미지로 시작하기") {
      setMessages((prev) => [...prev, { role: "user", content }]);
      setInputText("");
      setMessages((prev) => [...prev, { role: "bot", content: "아래 업로드 영역을 클릭하거나 이미지를 드래그해서 올려주세요.\n\n이름·전화번호 등 개인정보는 자동 마스킹됩니다." }]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInputText("");
    setIsRequesting(true);
    const stopAnimation = startPipelineAnimation();

    try {
      const jobId = await startRecommend(content, priorRequirementsRef.current);
      const result = await pollRecommendJob(jobId);
      priorRequirementsRef.current = result.parsed_requirements;

      if (result.type === "clarification_needed") {
        setMessages((prev) => [...prev, { role: "bot", content: result.message }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "bot",
          content: `✅ 분석 완료! 조건을 만족하는 요금제 ${result.cards.length}가지입니다. 월 비용 기준 오름차순으로 정렬했습니다.`,
          cards: result.cards,
        }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "bot",
        content: `⚠ ${e instanceof Error ? e.message : "요청 처리 중 오류가 발생했습니다."} 잠시 후 다시 시도해 주세요.`,
      }]);
    } finally {
      stopAnimation();
      setPipelineSteps(null);
      setIsRequesting(false);
    }
  }, [startPipelineAnimation]);

  const isBusy = isRequesting || pipelineSteps !== null;

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
                {msg.options && i === messages.length - 1 && !isBusy && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.options.map((opt) => (
                      <button key={opt} onClick={() => sendMessage(opt)} className="reply-chip">{opt}</button>
                    ))}
                  </div>
                )}

                {/* 추천 플랜 카드 */}
                {msg.cards && (
                  <div className="space-y-3 w-full mt-1">
                    {msg.cards.map((card, rank) => (
                      <div key={card.candidate_id} className={rank === 0 ? "card-highlight" : "card"} style={{ padding: "1.25rem" }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`badge ${rank === 0 ? "badge-cyan" : "badge-muted"} font-mono`}>
                                #{rank + 1}
                              </span>
                              {card.is_approximate && <span className="badge badge-muted">근사치</span>}
                              {card.plan.carrier_name && <span className="text-[var(--text-30)] text-xs">{card.plan.carrier_name}</span>}
                            </div>
                            <div className="font-display text-[var(--text-main)] font-semibold text-sm">
                              {card.plan.plan_name ?? `요금제 #${card.plan.plan_id}`}
                            </div>
                            {card.combine_product && (
                              <div className="text-[var(--text-35)] text-xs mt-0.5">{card.combine_product.combine_type} 적용</div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="price-large text-xl">{formatWon(card.monthly_cost)}</div>
                            <div className="text-[var(--text-30)] text-xs">/ 월</div>
                          </div>
                        </div>

                        <div className="space-y-1 mb-3 pt-3 border-t border-[var(--border-5)]">
                          <div className="data-row text-xs">
                            <span className="text-[var(--text-40)]">요금제 기본요금</span>
                            <span className="font-mono font-medium text-[var(--text-60)]">{formatWon(card.plan.monthly_fee)}</span>
                          </div>
                          <div className="data-row text-xs">
                            <span className="text-[var(--text-40)]">데이터</span>
                            <span className="font-mono font-medium text-[var(--text-60)]">
                              {card.plan.data_gb >= 999 ? "무제한" : `${card.plan.data_gb}GB`}
                            </span>
                          </div>
                          {card.handset && (
                            <div className="data-row text-xs">
                              <span className="text-[var(--text-40)]">단말기 출고가</span>
                              <span className="font-mono font-medium text-[var(--text-60)]">{formatWon(card.upfront_cost)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-[var(--text-30)] text-xs">24개월 총 {formatWon(card.total_24m_cost)}</div>
                          {card.subsidy_choice && (
                            <div className="badge badge-muted font-mono">{card.subsidy_choice}</div>
                          )}
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
              placeholder="상황을 자유롭게 입력하세요 (예: 가족 3명 KT 사용 중, 워치 추가 원함)"
              className="input-field flex-1"
              disabled={isBusy}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isBusy}
              className="btn-primary !px-4 !py-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <p className="text-center mt-2 text-xs text-[var(--text-20)]">
            빠른 선택 버튼 또는 자연어로 직접 입력 · &apos;다시 시작&apos;으로 초기화
          </p>
        </div>
      </div>
    </div>
  );
}
