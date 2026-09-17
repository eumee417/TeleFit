import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AgentClientService, RecommendAgentRequest } from '../AgentClient/Agent-client.service';
import { JobRecord, JobsService } from '../Jobs/Jobs.service';

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly agentClient: AgentClientService,
  ) {}

  async startRecommend(body: RecommendAgentRequest): Promise<string> {
    const jobId = randomUUID();
    await this.jobs.create(jobId);

    // 의도적으로 await 안 함 — 여기서 202를 먼저 반환하고, 실제 agent 호출은
    // 백그라운드에서 계속 진행됨 (별도 큐/워커 없이 같은 프로세스 안에서 처리하기로 확정).
    // runInBackground 내부에 try/catch가 반드시 있어야 함 — 없으면 실패 시
    // unhandled rejection으로 프로세스 전체가 죽을 수 있음.
    this.runInBackground(jobId, body);

    return jobId;
  }

  private async runInBackground(jobId: string, body: RecommendAgentRequest): Promise<void> {
    try {
      const result = await this.agentClient.recommend(body);
      await this.jobs.set(jobId, { status: 'done', result });
    } catch (err) {
      this.logger.error(`recommend job ${jobId} failed`, err instanceof Error ? err.stack : String(err));
      await this.jobs.set(jobId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId);
  }
}