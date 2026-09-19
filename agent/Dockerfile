# 배포용 이미지. agent/ 폴더 자체를 build context로 씀 (agent/docker-compose.yml 기준).
# agent.worker:app 형태로 import하기 때문에, 이 폴더가 컨테이너 안에서
# /app/agent 처럼 "패키지 이름과 같은 폴더" 밑에 들어가야 함 — 그래서 /app이 아니라
# /app/agent에 COPY하고, 실행은 그 상위 디렉터리(/app)에서 한다.

FROM python:3.12-slim

WORKDIR /app/agent
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

WORKDIR /app
EXPOSE 8000
CMD ["uvicorn", "agent.worker:app", "--host", "0.0.0.0", "--port", "8000"]
