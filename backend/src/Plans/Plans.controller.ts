import { Body, Controller, Post } from '@nestjs/common';
import { type PlanSearchParams, type PlanSearchResult, PlansService } from './Plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post('search')
  async search(@Body() body: PlanSearchParams): Promise<PlanSearchResult[]> {
    return this.plansService.search(body);
  }
}