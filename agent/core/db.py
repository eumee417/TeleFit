"""
PostgreSQL 커넥션 풀.

절대 원칙: DB 접근은 Retriever 노드에서만 일어나야 함. 다른 노드는 이 모듈을
import하지 않는다 (Calculator는 Retriever가 candidates에 실어준 데이터만 씀).
"""

from __future__ import annotations

import os

import asyncpg

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_URL"],
            min_size=1,
            max_size=5,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None