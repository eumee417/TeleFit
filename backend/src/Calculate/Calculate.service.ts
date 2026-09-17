import { Injectable } from '@nestjs/common';
import { AgentClientService, CalculateAgentRequest } from '../AgentClient/Agent-client.service';

@Injectable()
export class CalculateService {
  constructor(private readonly agentClient: AgentClientService) {}

  async calculate(body: CalculateAgentRequest): Promise<unknown> {
    return this.agentClient.calculate(body);
  }
}