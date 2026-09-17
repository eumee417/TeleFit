import { Module } from '@nestjs/common';
import { AgentClientModule } from '../AgentClient/Agent-client.module';
import { RecommendController } from './Recommend.controller';
import { RecommendService } from './Recommend.service';

@Module({
  imports: [AgentClientModule],
  controllers: [RecommendController],
  providers: [RecommendService],
})
export class RecommendModule {}