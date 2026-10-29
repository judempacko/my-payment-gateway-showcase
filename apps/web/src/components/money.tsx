import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Money({
  amountMinor,
  currency,
  className,
  locale = 'fr',
}: {
  amountMinor: string;
  currency: string;
  className?: string;
  locale?: string;
}) {
  return (
    <span className={cn('tabular-nums', className)}>
      {formatMoney(amountMinor, currency, locale)}
    </span>
  );
}
