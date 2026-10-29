import type { PaymentStatus } from '@pay/contracts';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone =
  'statusNeutral' | 'statusSuccess' | 'statusWarning' | 'statusDanger' | 'statusInfo';

const toneByStatus: Record<PaymentStatus, StatusTone> = {
  CREATED: 'statusNeutral',
  PENDING: 'statusWarning',
  REQUIRES_ACTION: 'statusWarning',
  PROCESSING: 'statusInfo',
  SUCCEEDED: 'statusSuccess',
  FAILED: 'statusDanger',
  EXPIRED: 'statusNeutral',
  CANCELED: 'statusNeutral',
  REFUND_PENDING: 'statusInfo',
  PARTIALLY_REFUNDED: 'statusWarning',
  REFUNDED: 'statusSuccess',
};

export function StatusBadge({
  status,
  pulse = false,
  compact = false,
}: {
  status: PaymentStatus;
  pulse?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations('status');
  const shortT = useTranslations('statusShort');

  return (
    <Badge
      variant={toneByStatus[status]}
      className={cn('whitespace-nowrap', compact && 'gap-1.5 px-2.5 py-0.5 text-sm')}
    >
      <span
        className={cn('h-2 w-2 rounded-full bg-current', pulse && 'animate-pulse')}
        aria-hidden="true"
      />
      {compact ? shortT(status) : t(status)}
    </Badge>
  );
}
