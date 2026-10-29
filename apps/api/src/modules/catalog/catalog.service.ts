import type { Product } from '@pay/contracts';
import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../infra/db/database.service';
import { products } from '../../infra/db/schema';

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<Product[]> {
    const rows = await this.database.db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(desc(products.amountMinor));

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      amountMinor: row.amountMinor.toString(),
      currency: row.currency,
    }));
  }

  async getActive(id: string): Promise<Product | null> {
    const [row] = await this.database.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!row || !row.active) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      amountMinor: row.amountMinor.toString(),
      currency: row.currency,
    };
  }
}
