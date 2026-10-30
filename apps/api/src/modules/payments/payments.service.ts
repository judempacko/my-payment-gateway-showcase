import {
  isSettledStatus,
  type Payment,
  type PaymentEvent,
  type PaymentStats,
  type PaymentStatsDays,
  type WebhookRecord,
} from '@pay/contracts';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Observable } from 'rxjs';
import { stableStringify } from '../../common/stable-stringify';
import { CatalogService } from '../catalog/catalog.service';
import { MockPaymentProvider, type MockOutcome } from '../providers/mock/mock.provider';
import { ProviderRegistry } from '../providers/provider.registry';
import { WebhookIngestService } from '../webhooks/webhook-ingest.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { toPaymentEventDto } from './payment.mapper';
import { buildPaymentStats, statsWindowStart } from './payment-stats';
import { PaymentStateService } from './payment-state.service';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly catalog: CatalogService,
    private readonly registry: ProviderRegistry,
    private readonly mock: MockPaymentProvider,
    private readonly webhooks: WebhookIngestService,
    private readonly state: PaymentStateService,
  ) {}

  async create(dto: CreatePaymentDto, idempotencyKey?: string): Promise<Payment> {
    const key = idempotencyKey?.trim();
    let claimId: string | null = null;

    if (key) {
      const requestHash = createHash('sha256').update(stableStringify(dto)).digest('hex');
      const claim = await this.repository.claimIdempotency(key, requestHash);

      if (!claim.claimed) {
        if (claim.record.requestHash !== requestHash) {
          throw new ConflictException(
            'This Idempotency-Key was already used with a different payload',
          );
        }

        if (claim.record.responseBody) {
          return claim.record.responseBody as unknown as Payment;
        }

        throw new ConflictException('A request with this Idempotency-Key is still in progress');
      }

      claimId = claim.record.id;
    }

    try {
      const payment = await this.createInternal(dto);

      if (claimId) {
        await this.repository.completeIdempotency(claimId, payment);
      }

      return payment;
    } catch (error) {
      if (claimId) {
        await this.repository.releaseIdempotency(claimId);
      }

      throw error;
    }
  }

  async get(id: string): Promise<Payment> {
    const row = await this.repository.findById(id);

    if (!row) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return this.repository.asPaymentDto(row);
  }

  async list(query: ListPaymentsQueryDto): Promise<{
    items: Payment[];
    nextCursor: string | null;
    page?: number;
    pageSize?: number;
    total?: number;
    pageCount?: number;
  }> {
    return this.repository.list({
      status: query.status,
      provider: query.provider,
      limit: query.limit ?? 20,
      cursor: query.cursor,
      page: query.page,
    });
  }

  async stats(days: PaymentStatsDays): Promise<PaymentStats> {
    const now = new Date();
    const since = statsWindowStart(now, days);
    const [totals, series, webhooks] = await Promise.all([
      this.repository.statsTotals(),
      this.repository.statsSeries(since),
      this.repository.statsWebhooks(),
    ]);

    return buildPaymentStats({ totals, series, webhooks, days, now });
  }

  async timeline(id: string): Promise<PaymentEvent[]> {
    await this.get(id);
    const rows = await this.repository.listEvents(id);
    return rows.map(toPaymentEventDto);
  }

  async webhookRecords(id: string): Promise<WebhookRecord[]> {
    await this.get(id);
    return this.repository.listWebhooks(id);
  }

  async simulate(
    id: string,
    outcome: MockOutcome,
  ): Promise<{ accepted: true; webhookEventId: string | null; duplicate: boolean }> {
    const row = await this.repository.findById(id);

    if (!row) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    if (row.provider !== 'mock') {
      throw new BadRequestException('Simulation is only available for the mock provider');
    }

    if (isSettledStatus(row.status)) {
      throw new ConflictException(`Payment ${id} is already settled (${row.status})`);
    }

    const webhook = this.mock.buildSignedWebhook(row, outcome);
    const result = await this.webhooks.ingest('mock', {
      headers: webhook.headers,
      rawBody: Buffer.from(webhook.rawBody, 'utf8'),
      method: 'POST',
      path: '/api/v1/webhooks/mock',
      authority: 'localhost',
    });

    return {
      accepted: true,
      webhookEventId: result.id,
      duplicate: result.duplicate,
    };
  }

  stream(id: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let lastVersion = -1;
      let closed = false;

      const tick = async (): Promise<void> => {
        if (closed) {
          return;
        }

        try {
          const payment = await this.get(id);

          if (payment.version !== lastVersion) {
            lastVersion = payment.version;
            subscriber.next({ data: payment });

            if (isSettledStatus(payment.status)) {
              closed = true;
              subscriber.complete();
            }
          }
        } catch (error) {
          closed = true;
          subscriber.error(error);
        }
      };

      void tick();
      const timer = setInterval(() => {
        void tick();
      }, 1_000);

      return () => {
        closed = true;
        clearInterval(timer);
      };
    });
  }

  private async createInternal(dto: CreatePaymentDto): Promise<Payment> {
    const provider = this.registry.get(dto.provider);

    if (!provider.capabilities.methods.includes(dto.method)) {
      throw new BadRequestException(
        `Provider ${dto.provider} does not support method ${dto.method}`,
      );
    }

    const product = await this.catalog.getActive(dto.productId);

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found or inactive`);
    }

    if (!provider.capabilities.currencies.includes(product.currency)) {
      throw new BadRequestException(
        `Provider ${dto.provider} does not support currency ${product.currency}`,
      );
    }

    const amountMinor = BigInt(product.amountMinor) * BigInt(dto.quantity);
    const metadata = dto.metadata ?? {};

    const payment = await this.repository.insert({
      productId: product.id,
      quantity: dto.quantity,
      amountMinor,
      currency: product.currency,
      provider: dto.provider,
      method: dto.method,
      customer: dto.customer,
      metadata,
    });

    await this.repository.insertEvent({
      paymentId: payment.id,
      sequence: 1,
      type: 'PAYMENT_CREATED',
      source: 'api',
      fromStatus: null,
      toStatus: 'CREATED',
      payload: {
        productId: product.id,
        quantity: dto.quantity,
        amountMinor: amountMinor.toString(),
        currency: product.currency,
      },
    });

    let result;

    try {
      result = await provider.initializePayment({
        paymentId: payment.id,
        amountMinor,
        currency: product.currency,
        method: dto.method,
        productName: product.name,
        quantity: dto.quantity,
        customer: dto.customer,
        metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      await this.state.failInitialization(payment.id, message);
      throw new BadGatewayException('Payment provider initialization failed');
    }

    try {
      return await this.state.initializePayment(payment.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid provider transition';
      await this.state.failInitialization(payment.id, message);
      throw new BadGatewayException(message);
    }
  }
}
