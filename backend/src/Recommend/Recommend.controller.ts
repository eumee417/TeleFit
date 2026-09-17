import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import type { RecommendAgentRequest } from '../AgentClient/Agent-client.service';
import { JobRecord } from '../Jobs/Jobs.service';
import { RecommendService } from './Recommend.service';

@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Post()
  @HttpCode(202)
  async start(@Body() body: RecommendAgentRequest): Promise<{ jobId: string }> {
    const jobId = await this.recommendService.startRecommend(body);
    return { jobId };
  }

  @Get(':jobId')
  async poll(@Param('jobId') jobId: string): Promise<JobRecord> {
    const job = await this.recommendService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`job ${jobId} not found (만료됐거나 잘못된 jobId)`);
    }
    return job;
  }
}