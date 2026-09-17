import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../Database/Database.service';

export interface HandsetResult {
  handsetId: number;
  modelName: string;
  manufacturer: string;
  deviceCategory: string;
  releasePrice: number;
}

@Injectable()
export class HandsetsService {
  constructor(private readonly db: DatabaseService) {}

  async list(): Promise<HandsetResult[]> {
    const { rows } = await this.db.pool.query(
      `SELECT handset_id, model_name, manufacturer, device_category, release_price
       FROM handsets
       ORDER BY device_category, release_price ASC`,
    );
    return rows.map((r) => ({
      handsetId: r.handset_id,
      modelName: r.model_name,
      manufacturer: r.manufacturer,
      deviceCategory: r.device_category,
      releasePrice: r.release_price,
    }));
  }
}
