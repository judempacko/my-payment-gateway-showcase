import { PaymentProvider, canTransition, isSettledStatus } from '@pay/contracts';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { and, inArray, isNotNull, lt } from 'drizzle-orm';
import { DatabaseService } from '../infra/db/database.service';
import { payments } from '../infra/db/schema';
import { PaymentStateService } from '../modules/payments/payment-state.service';
import { ProviderRegistry } from '../modules/providers/provider.registry';

const RECONCILIATION_INTERVAL_MS = 60_000;
const STALE_AFTER_MS = 120_000;

@Injectable()
export class ProviderReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderReconciliationService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly database: DatabaseService,
    private readonly registry: ProviderRegistry,
    private readonly state: PaymentStateService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.sweep();
    }, RECONCILIATION_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async sweep(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);

    try {
      const candidates = await this.database.db
        .select({
          id: payments.id,
          provider: payments.provider,
          providerRef: payments.providerRef,
          status: payments.status,
        })
        .from(payments)
        .where(
          and(
            inArray(payments.provider, [PaymentProvider.STRIPE, PaymentProvider.PAWAPAY]),
            inArray(payments.status, ['PENDING', 'REQUIRES_ACTION', 'PROCESSING']),
            isNotNull(payments.providerRef),
            lt(payments.updatedAt, cutoff),
          ),
        )
        .limit(20);

      for (const candidate of candidates) {
        if (!candidate.providerRef || isSettledStatus(candidate.status)) {
          continue;
        }

        try {
          const provider = this.registry.get(candidate.provider);
          const snapshot = await provider.getPayment(candidate.providerRef);

          if (!canTransition(candidate.status, snapshot.status)) {
            continue;
          }

          const applied = await this.state.applyProviderSnapshot(candidate.id, snapshot.status, {
            providerRef: candidate.providerRef,
            rawStatus: snapshot.status,
            amountMinor: snapshot.amountMinor,
            currency: snapshot.currency,
          });

          if (applied) {
            this.logger.log(
              `Reconciled ${candidate.id}: ${candidate.status} -> ${snapshot.status}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Reconciliation skipped for ${candidate.id} (${candidate.provider}): ${String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Reconciliation sweep failed: ${String(error)}`);
    }
  }
}
