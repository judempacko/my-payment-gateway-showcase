import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Database,
  GitBranch,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_DOCS_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const rails = [
  { id: 'mock', name: 'Mock' },
  { id: 'stripe', name: 'Stripe' },
  { id: 'pawapay', name: 'PawaPay' },
] as const;

const guarantees = [
  { id: 'signature', icon: ShieldCheck },
  { id: 'inbox', icon: Database },
  { id: 'state', icon: GitBranch },
  { id: 'idempotent', icon: Zap },
] as const;

const pipeline = [
  { left: 'POST /payments', rightKey: 'serverSide' },
  { left: 'webhook_events', rightKey: 'hmacVerified' },
  { left: 'bullmq:webhooks', rightKey: 'attempt' },
  { left: 'payments.status', rightKey: null },
] as const;

async function RailsArtifact() {
  const t = await getTranslations('home');

  return (
    <Card className="w-56 gap-3 rounded-2xl bg-paper-white py-0 pt-4 pr-5 pb-3 pl-3 shadow-subtle-3">
      <CardHeader className="px-0">
        <p className="text-sm text-ash-gray">{t('artifacts.rails')}</p>
      </CardHeader>
      <CardContent className="space-y-2 px-0">
        {rails.map((rail) => (
          <div key={rail.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-black">{rail.name}</span>
            <span className="inline-flex items-center gap-2 text-sm text-slate-gray">
              <span className="size-2 rounded-full bg-ink-black" />
              {t(`rails.${rail.id}.state`)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function PaymentArtifact({ className }: { className?: string }) {
  const t = await getTranslations('home.artifacts');
  const pipelineT = await getTranslations('home.pipeline');
  const status = await getTranslations('status');

  return (
    <Card
      className={cn(
        'w-84 gap-4 rounded-2xl bg-paper-white py-0 pt-4 pr-5 pb-3 pl-3 shadow-subtle-3',
        className,
      )}
    >
      <CardHeader className="gap-2 px-0">
        <div className="flex items-center justify-between gap-3">
          <span className="tabular-nums text-sm text-slate-gray">payment_01HQ…</span>
          <Badge variant="success">{status('SUCCEEDED')}</Badge>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ash-gray">{t('amount')}</span>
          <span className="tabular-nums text-subheading text-ink-black">{t('amountValue')}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-0">
        {pipeline.map((entry) => (
          <div key={entry.left} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-ink-black" aria-hidden="true" />
            <span className="tabular-nums min-w-0 flex-1 truncate text-sm text-ink-black">
              {entry.left}
            </span>
            <span className="text-right text-sm text-slate-gray">
              {entry.rightKey ? pipelineT(entry.rightKey, { count: 1 }) : 'PENDING → SUCCEEDED'}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function ChartArtifact() {
  const t = await getTranslations('home.artifacts');

  return (
    <Card className="w-56 gap-3 rounded-2xl bg-paper-white py-0 pt-4 pr-5 pb-3 pl-3 shadow-subtle-3">
      <CardHeader className="px-0">
        <p className="text-sm text-ash-gray">{t('activation')}</p>
        <span className="text-body-lg font-medium text-ink-black">{t('activationValue')}</span>
        <span className="text-sm text-slate-gray">{t('activationDelta')}</span>
      </CardHeader>
      <CardContent className="px-0">
        <svg viewBox="0 0 160 48" className="h-12 w-full" fill="none" aria-hidden="true">
          <path
            d="M2 42 C18 40 24 30 38 32 C52 34 58 22 72 24 C88 26 94 12 108 16 C122 20 132 8 158 4"
            stroke="#5d2a1a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </CardContent>
    </Card>
  );
}

async function ComposerArtifact() {
  const t = await getTranslations('home.artifacts');

  return (
    <div className="w-80 rounded-2xl bg-paper-white pt-4 pr-5 pb-3 pl-3 shadow-subtle-3">
      <div className="flex items-center gap-2 rounded-lg border border-border p-4">
        <span className="flex size-10 items-center justify-center rounded-full text-ash-gray">
          @
        </span>
        <span className="flex size-10 items-center justify-center rounded-full text-ash-gray">
          <Info className="size-4" aria-hidden="true" />
        </span>
        <span className="flex-1 truncate text-base text-smoke-gray">{t('askAnything')}</span>
        <span className="flex size-10 items-center justify-center rounded-full bg-ink-black text-paper-white">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 flex gap-2 px-1">
        <span className="rounded-full bg-mist-gray px-2 py-1 text-sm text-slate-gray">
          {t('failedWebhooks')}
        </span>
        <span className="rounded-full bg-mist-gray px-2 py-1 text-sm text-slate-gray">
          {t('refunds')}
        </span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <div>
      <section className="page-shell relative pt-8 pb-20 sm:pt-16 lg:pb-24">
        <div className="relative">
          <div className="relative mx-auto max-w-3xl pt-6 text-center">
            <Link
              href="/dashboard"
              className="group relative mx-5 mb-8 inline-flex items-center gap-2.5 rounded-full border border-black/[0.04] bg-black/[0.04] px-4 py-[9px] text-[15px] leading-[21px] font-w430 whitespace-nowrap text-ink-black tabular-nums transition-colors hover:bg-black/[0.07]"
            >
              <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
                <Bell className="size-[18px]" aria-hidden="true" />
                <span
                  className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#EB8080]"
                  aria-hidden="true"
                />
              </span>
              <span className="pb-px">{t('hero.eyebrow')}</span>
              <span className="relative flex shrink-0 overflow-hidden opacity-50">
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>

            <h1 className="mt-0 font-serif text-heading tracking-heading text-ink-black sm:text-heading-lg sm:tracking-heading-lg lg:text-[72px] lg:leading-[1.25] lg:tracking-[-1.6px]">
              {t('hero.titleLine1')}
              <br />
              <em>{t('hero.titleEmphasis')}</em> {t('hero.titleLine2')}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-body text-slate-gray">{t('hero.subtitle')}</p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/checkout">{t('hero.runPayment')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">{t('hero.merchantDashboard')}</Link>
              </Button>
            </div>

            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="group mt-6 inline-flex items-center gap-2 py-5 text-base text-ink-black underline-offset-4 transition-colors hover:underline"
            >
              {t('hero.readDocs')}
            </a>
          </div>

          <div className="mt-16 hidden items-end justify-center gap-4 xl:flex">
            <div className="translate-y-3">
              <RailsArtifact />
            </div>
            <div className="translate-y-8">
              <ChartArtifact />
            </div>
            <div className="-translate-y-1">
              <PaymentArtifact />
            </div>
            <div className="translate-y-5">
              <ComposerArtifact />
            </div>
          </div>

          <div className="mt-10 flex justify-center xl:hidden">
            <div className="w-full max-w-84">
              <PaymentArtifact className="w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell border-t border-border py-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm text-ash-gray">{t('providerStrategy.eyebrow')}</p>
            <h2 className="mt-4 font-serif text-heading tracking-heading text-ink-black">
              {t('providerStrategy.titleLine1')}
              <br />
              <em>{t('providerStrategy.titleEmphasis')}</em> {t('providerStrategy.titleLine2')}
            </h2>
          </div>
          <p className="max-w-lg text-body text-slate-gray lg:justify-self-end">
            {t('providerStrategy.description')}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {rails.map((rail) => (
            <Card key={rail.id} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ash-gray">{t(`rails.${rail.id}.tag`)}</span>
                  <Badge variant={rail.id === 'mock' ? 'success' : 'neutral'}>
                    {t(`rails.${rail.id}.state`)}
                  </Badge>
                </div>
                <CardTitle className="mt-5">{rail.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-8">
                <p className="text-base text-slate-gray">{t(`rails.${rail.id}.description`)}</p>
                <Link
                  href="/checkout"
                  className="group inline-flex items-center gap-2 py-5 text-base text-ink-black underline-offset-4 transition-colors hover:underline"
                >
                  {t('providerStrategy.runOnRail')}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-20 bg-blush-peach text-sienna-brown">
          <CardContent className="px-6 py-6 sm:px-10 sm:py-10">
            <p className="text-sm">{t('invariant.eyebrow')}</p>
            <p className="mt-4 max-w-3xl text-heading-sm font-w450 tracking-heading-sm">
              {t('invariant.quote')}
            </p>
            <p className="mt-6 text-sm">{t('invariant.description')}</p>
          </CardContent>
        </Card>
      </section>

      <section className="page-shell border-t border-border py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm text-ash-gray">{t('pipeline.eyebrow')}</p>
            <h2 className="mt-4 font-serif text-heading tracking-heading text-ink-black">
              {t('pipeline.titleLine1')}
              <br />
              <em>{t('pipeline.titleEmphasis')}</em> {t('pipeline.titleLine2')}
            </h2>
            <p className="mt-5 max-w-sm text-body text-slate-gray">{t('pipeline.description')}</p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/dashboard">{t('pipeline.openDashboard')}</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {guarantees.map((guarantee) => {
              const Icon = guarantee.icon;

              return (
                <Card key={guarantee.id}>
                  <CardHeader>
                    <Icon className="size-4 text-ink-black" aria-hidden="true" />
                    <CardTitle className="mt-4">{t(`guarantees.${guarantee.id}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-slate-gray">
                      {t(`guarantees.${guarantee.id}.body`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-fog-white">
        <div className="page-shell py-20 text-center">
          <p className="text-sm text-ash-gray">{t('pipeline.ctaEyebrow')}</p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-heading tracking-heading text-ink-black sm:text-heading-lg sm:tracking-heading-lg">
            {t('pipeline.ctaTitleLine1')}
            <br />
            <em>{t('pipeline.ctaTitleLine2')}</em>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-body text-slate-gray">
            {t('pipeline.ctaDescription')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/checkout">{t('pipeline.runPayment')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">{t('pipeline.seeTransactions')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
