"""
graph.py — Router -> Retriever -> Calculator <-> Grader(self-correction) -> Output

router/retriever/calculator/grader/output 전부 실제 구현을 agent/nodes/에서 import.

각 노드 함수 계약: async def node(state: AgentState) -> dict
  반환 dict는 AgentState의 일부 키만 담으면 됨 (LangGraph가 나머지와 merge).
"""

from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from agent.core.constants import MAX_RETRY
from agent.core.state import AgentState
from agent.nodes.calculator import calculator_node
from agent.nodes.grader import grader_node
from agent.nodes.output import output_node
from agent.nodes.retriever import retriever_node
from agent.nodes.router import router_node

# ---------------------------------------------------------------------------
# 조건부 엣지
# ---------------------------------------------------------------------------


def route_after_router(state: AgentState) -> Literal["retriever", "__end__"]:
    if state["parsed_requirements"].get("needs_clarification"):
        # 무상태 원칙: 프론트가 이 되묻기 응답 + priorRequirements를 다음 요청에 다시 실어 보냄.
        return END
    return "retriever"


def route_after_grader(state: AgentState) -> Literal["calculator", "output"]:
    candidates = state.get("candidates", [])
    still_pending = any(c.get("status") == "PENDING" for c in candidates)

    if not still_pending:
        return "output"

    if state.get("retry_count", 0) >= MAX_RETRY:
        # Grader가 이 시점까지 남은 PENDING을 FALLBACK으로 마킹해뒀어야 함 (grader_node 계약).
        return "output"

    return "calculator"


# ---------------------------------------------------------------------------
# 그래프 조립
# ---------------------------------------------------------------------------


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("calculator", calculator_node)
    graph.add_node("grader", grader_node)
    graph.add_node("output", output_node)

    graph.set_entry_point("router")

    graph.add_conditional_edges(
        "router",
        route_after_router,
        {"retriever": "retriever", END: END},
    )
    graph.add_edge("retriever", "calculator")
    graph.add_edge("calculator", "grader")
    graph.add_conditional_edges(
        "grader",
        route_after_grader,
        {"calculator": "calculator", "output": "output"},
    )
    graph.add_edge("output", END)

    return graph.compile()