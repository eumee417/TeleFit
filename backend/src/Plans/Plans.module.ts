import { Module } from '@nestjs/common';
import { PlansController } from './Plans.controller';
import { PlansService } from './Plans.service';

@Module({
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}