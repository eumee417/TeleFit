"""
LLM / 임베딩 / 리랭커 클라이언트를 한 곳에서만 생성.
노드들은 여기 있는 get_*() 함수를 호출해서 쓰고, 직접 API 키를 읽거나
클라이언트를 새로 만들지 않는다. Provider를 바꿀 땐 이 파일만 고치면 되고,
이 파일을 쓰는 노드 코드는 손댈 필요 없음.

메인 LLM: OpenAI (2026-09 확정).
TODO: 임베딩/리랭커 모델명 미확정 — Retriever 작업 시 채울 것.
"""

from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def get_llm():
    """Router/Calculator(/Grader)가 공유하는 메인 LLM. Tool Calling 지원 필수.

    OpenAI는 2026-09 기준 Tool Calling이 Responses API 전용으로 넘어가서
    use_responses_api=True를 명시적으로 켜둠 (langchain-openai 0.3.9+).
    모델은 gpt-5.6-terra 기본값 — GPT-6 Astra(2026-09-03 출시)는 토큰당 비용이
    GPT-5.6 대비 2.5배고 아직 단계적 롤아웃 중이라 이번 스코프엔 안 맞다고 보고 뺐음.
    """
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=os.environ.get("MAIN_LLM_MODEL", "gpt-5.6-terra"),  # TODO: 필요시 gpt-5.6-sol/luna로 교체
        api_key=os.environ["OPENAI_API_KEY"],
        temperature=0,
        use_responses_api=True,
    )


@lru_cache(maxsize=1)
def get_embedding_model():
    """Retriever의 pgvector 임베딩 생성용. Hugging Face 사용 확정, 모델명은 TODO."""
    from sentence_transformers import SentenceTransformer

    model_name = os.environ.get("EMBEDDING_MODEL_NAME", "")
    if not model_name:
        raise RuntimeError("EMBEDDING_MODEL_NAME 미설정 — Retriever 작업 시 모델 확정 필요")
    return SentenceTransformer(model_name)


@lru_cache(maxsize=1)
def get_reranker():
    """Retriever 하이브리드 검색 결과 재정렬용. Hugging Face 사용 확정, 모델명은 TODO."""
    from sentence_transformers import CrossEncoder

    model_name = os.environ.get("RERANKER_MODEL_NAME", "")
    if not model_name:
        raise RuntimeError("RERANKER_MODEL_NAME 미설정 — Retriever 작업 시 모델 확정 필요")
    return CrossEncoder(model_name)