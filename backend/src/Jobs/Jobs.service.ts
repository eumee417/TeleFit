import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const JOB_TTL_SECONDS = 600; // 10분 — 로그인/히스토리 없는 1회성 추적용

export type JobStatus = 'pending' | 'done' | 'error';

export interface JobRecord {
  status: JobStatus;
  result?: unknown;
  error?: string;
}

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  private key(jobId: string): string {
    return `job:${jobId}`;
  }

  async create(jobId: string): Promise<void> {
    await this.set(jobId, { status: 'pending' });
  }

  async set(jobId: string, record: JobRecord): Promise<void> {
    await this.redis.set(this.key(jobId), JSON.stringify(record), 'EX', JOB_TTL_SECONDS);
  }

  async get(jobId: string): Promise<JobRecord | null> {
    const raw = await this.redis.get(this.key(jobId));
    return raw ? (JSON.parse(raw) as JobRecord) : null;
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}