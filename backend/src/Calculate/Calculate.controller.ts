import { Body, Controller, Post } from '@nestjs/common';
import type { CalculateAgentRequest } from '../AgentClient/Agent-client.service';
import { CalculateService } from './Calculate.service';

@Controller('calculate')
export class CalculateController {
  constructor(private readonly calculateService: CalculateService) {}

  @Post()
  async calculate(@Body() body: CalculateAgentRequest): Promise<unknown> {
    return this.calculateService.calculate(body);
  }
}