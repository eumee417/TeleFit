import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface RecommendAgentRequest {
  message: string;
  prior_requirements?: Record<string, unknown> | null;
}

export interface CalculateAgentRequest {
  plan_id: number;
  combine_product_id?: number | null;
  family_line_count?: number;
  handset_id?: number | null;
  subscription_type?: 'UPGRADE' | 'MNP' | null;
}

@Injectable()
export class AgentClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('AGENT_BASE_URL');
  }

  async recommend(body: RecommendAgentRequest): Promise<unknown> {
    return this.post('/recommend', body);
  }

  async calculate(body: CalculateAgentRequest): Promise<unknown> {
    return this.post('/calculate', body);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    try {
      const res = await firstValueFrom(this.http.post(`${this.baseUrl}${path}`, body));
      return res.data;
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        // agent가 준 status/detail(예: 404 plan_id not found)을 그대로 프론트까지 전달
        throw new HttpException(err.response.data, err.response.status);
      }
      throw err;
    }
  }
}