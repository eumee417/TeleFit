import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AgentClientService } from './Agent-client.service';

@Module({
  imports: [HttpModule.register({ timeout: 60_000 })],
  providers: [AgentClientService],
  exports: [AgentClientService],
})
export class AgentClientModule {}