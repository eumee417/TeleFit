import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../Database/Database.service';

export interface PlanSearchParams {
  carrier?: string;
  minDataGb?: number;
  maxMonthlyFee?: number;
}

export interface PlanSearchResult {
  planId: number;
  carrierName: string;
  planName: string;
  baseFee: number;
  dataGb: number;
  selectiveDiscountEligible: boolean;
}

@Injectable()
export class PlansService {
  constructor(private readonly db: DatabaseService) {}

  async search(params: PlanSearchParams): Promise<PlanSearchResult[]> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];

    if (params.carrier) {
      values.push(params.carrier);
      conditions.push(`c.carrier_name = $${values.length}`);
    }
    if (params.minDataGb !== undefined) {
      values.push(params.minDataGb);
      conditions.push(`p.data_gb >= $${values.length}`);
    }
    if (params.maxMonthlyFee !== undefined) {
      values.push(params.maxMonthlyFee);
      conditions.push(`p.base_fee <= $${values.length}`);
    }

    const query = `
      SELECT p.plan_id, c.carrier_name, p.plan_name, p.base_fee, p.data_gb, p.selective_discount_eligible
      FROM plans p
      JOIN carriers c ON c.carrier_id = p.carrier_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.base_fee ASC
      LIMIT 50
    `;

    const { rows } = await this.db.pool.query(query, values);
    return rows.map((r) => ({
      planId: r.plan_id,
      carrierName: r.carrier_name,
      planName: r.plan_name,
      baseFee: r.base_fee,
      dataGb: r.data_gb,
      selectiveDiscountEligible: r.selective_discount_eligible,
    }));
  }
}