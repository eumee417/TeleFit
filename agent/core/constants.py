"""그래프 전역 상수. graph.py와 grader.py가 같이 참조해서 별도 파일로 분리
(grader.py가 graph.py를 import하면 순환 참조가 생기기 때문)."""

MAX_RETRY = 3  # CLAUDE.md 절대 원칙: 재시도 상한 3회