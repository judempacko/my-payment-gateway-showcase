'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function JsonViewer({
  value,
  label,
  className,
}: {
  value: unknown;
  label?: string;
  className?: string;
}) {
  const t = useTranslations('common');
  const resolvedLabel = label ?? t('payload');
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-border bg-paper-white', className)}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm text-slate-gray">{resolvedLabel}</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={copy}
          aria-label={`${t('copy')} ${resolvedLabel}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
      <pre
        className="tabular-nums max-h-72 overflow-auto p-3 text-sm text-ink-black"
        tabIndex={0}
        aria-label={resolvedLabel}
      >
        {text}
      </pre>
    </div>
  );
}
