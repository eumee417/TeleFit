import { Module } from '@nestjs/common';
import { AgentClientModule } from '../AgentClient/Agent-client.module';
import { CalculateController } from './Calculate.controller';
import { CalculateService } from './Calculate.service';

@Module({
  imports: [AgentClientModule],
  controllers: [CalculateController],
  providers: [CalculateService],
})
export class CalculateModule {}