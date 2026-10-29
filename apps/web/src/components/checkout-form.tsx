'use client';

import type { CreatePaymentRequest, Product, ProviderInfo } from '@pay/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Beaker,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  Truck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Money } from '@/components/money';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useRouter } from '@/i18n/navigation';
import { ApiError, createPayment } from '@/lib/api';
import { getProductPresentation, localized } from '@/lib/catalog-presentation';
import {
  firstInvalidStep as getFirstInvalidStep,
  validateAll as validateAllValues,
  validateContact as validateContactValues,
  validateDelivery as validateDeliveryValues,
  validatePayment as validatePaymentValues,
  validateReview as validateReviewValues,
  type CheckoutErrors,
} from '@/lib/checkout-validation';
import { formatMoney } from '@/lib/format';
import { buildPaymentMethods, type ShopperPaymentMethod } from '@/lib/payment-methods';
import { queryKeys } from '@/lib/query-keys';
import { regionConfig, type Region } from '@/lib/region-config';
import { cn } from '@/lib/utils';

const STEPS = ['contact', 'delivery', 'payment', 'review'] as const;
type Step = 0 | 1 | 2 | 3;
type FieldErrors = CheckoutErrors;

const DRAFT_KEY = 'orbit:checkout-draft';

const icons = {
  card: CreditCard,
  mobile_money: Smartphone,
} as const;

export function CheckoutForm({
  products,
  providers,
  initialProductId,
  region,
  locale,
}: {
  products: Product[];
  providers: ProviderInfo[];
  initialProductId: string;
  region: Region;
  locale: string;
}) {
  const t = useTranslations('checkout');
  const rootT = useTranslations();
  const common = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const config = regionConfig(region);

  const [productId, setProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState(1);
  const [methodId, setMethodId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const submittedRef = useRef(false);
  const idempotencyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const mountedRef = useRef(false);

  const product = products.find((item) => item.id === productId) ?? products[0];
  const presentation = product ? getProductPresentation(product.slug) : undefined;
  const methods = useMemo(() => buildPaymentMethods(product, providers), [product, providers]);
  const method = methods.find((item) => item.id === methodId) ?? methods[0];
  const totalMinor = product ? BigInt(product.amountMinor) * BigInt(quantity) : 0n;
  const totalLabel = product
    ? formatMoney(totalMinor.toString(), product.currency, locale)
    : formatMoney('0', config.currency, locale);

  const payload = useMemo<CreatePaymentRequest | null>(() => {
    if (!product || !method) {
      return null;
    }

    return {
      productId: product.id,
      quantity,
      provider: method.provider,
      method: method.method,
      customer: {
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        country: config.country,
      },
      metadata: {
        shippingAddress: {
          line1: address1.trim(),
          line2: address2.trim() || undefined,
          city: city.trim(),
          postalCode: postalCode.trim() || undefined,
          country: config.country,
        },
        deliveryMethod: 'standard',
        termsAcceptedAt: terms ? new Date().toISOString() : null,
        marketingOptIn: marketing,
        locale,
        region,
      },
    };
  }, [
    product,
    method,
    quantity,
    name,
    email,
    phone,
    address1,
    address2,
    city,
    postalCode,
    terms,
    marketing,
    locale,
    region,
    config.country,
  ]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!payload || !idempotencyRef.current) {
        throw new Error('Checkout is not ready');
      }

      return createPayment(payload, idempotencyRef.current);
    },
    onSuccess: (payment) => {
      queryClient.setQueryData(queryKeys.payment(payment.id), payment);
      sessionStorage.removeItem(DRAFT_KEY);
      idempotencyRef.current = null;
      router.push(`/checkout/${payment.id}`);
    },
    onError: (error) => {
      setGeneralError(mapError(error));
    },
    onSettled: () => {
      submittedRef.current = false;
    },
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);

      if (raw) {
        const draft = JSON.parse(raw) as {
          productId?: string;
          quantity?: number;
          methodId?: string;
          email?: string;
          name?: string;
          phone?: string;
          address1?: string;
          address2?: string;
          city?: string;
          postalCode?: string;
          marketing?: boolean;
        };

        if (draft.productId && products.some((item) => item.id === draft.productId)) {
          setProductId(draft.productId);
        }
        if (typeof draft.quantity === 'number') setQuantity(draft.quantity);
        if (draft.methodId) setMethodId(draft.methodId);
        if (draft.email) setEmail(draft.email);
        if (draft.name) setName(draft.name);
        if (draft.phone) setPhone(draft.phone);
        if (draft.address1) setAddress1(draft.address1);
        if (draft.address2) setAddress2(draft.address2);
        if (draft.city) setCity(draft.city);
        if (draft.postalCode) setPostalCode(draft.postalCode);
        if (typeof draft.marketing === 'boolean') setMarketing(draft.marketing);
      }
    } catch {
      // Ignore an invalid draft.
    } finally {
      hydratedRef.current = true;
    }
  }, [products]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        productId,
        quantity,
        methodId,
        email,
        name,
        phone,
        address1,
        address2,
        city,
        postalCode,
        marketing,
      }),
    );
  }, [
    productId,
    quantity,
    methodId,
    email,
    name,
    phone,
    address1,
    address2,
    city,
    postalCode,
    marketing,
  ]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    stepHeadingRef.current?.focus();
  }, [step]);

  function clearError(key: string) {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function resetIdempotency() {
    idempotencyRef.current = null;
  }

  function updateProduct(value: string) {
    setProductId(value);
    setMethodId('');
    resetIdempotency();
    setErrors({});
  }

  function updateQuantity(value: string) {
    setQuantity(Number(value));
    resetIdempotency();
  }

  function validateContact(): FieldErrors {
    return validateContactValues({ email, name, phone }, Boolean(method?.requiresPhone));
  }

  function validateDelivery(): FieldErrors {
    return validateDeliveryValues({ address1, city, postalCode }, config.postalCodeRequired);
  }

  function validatePayment(): FieldErrors {
    return validatePaymentValues(
      { email, name, phone },
      Boolean(method?.requiresPhone),
      Boolean(method),
    );
  }

  function validateReview(): FieldErrors {
    return validateReviewValues(terms);
  }

  function validateAll(): FieldErrors {
    return validateAllValues(
      { email, name, phone, address1, city, postalCode },
      {
        requiresPhone: Boolean(method?.requiresPhone),
        postalCodeRequired: config.postalCodeRequired,
        hasMethod: Boolean(method),
        terms,
      },
    );
  }

  function firstInvalidStep(next: FieldErrors): Step {
    return getFirstInvalidStep(next);
  }

  function showErrors(next: FieldErrors) {
    setErrors(next);
    setGeneralError(null);
    window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
  }

  function goNext() {
    const stepErrors =
      step === 0
        ? validateContact()
        : step === 1
          ? validateDelivery()
          : step === 2
            ? validatePayment()
            : validateReview();

    if (Object.keys(stepErrors).length > 0) {
      showErrors(stepErrors);
      return;
    }

    setErrors({});
    setGeneralError(null);
    setStep((current) => Math.min(3, current + 1) as Step);
  }

  function goBack() {
    setErrors({});
    setGeneralError(null);
    setStep((current) => Math.max(0, current - 1) as Step);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittedRef.current || mutation.isPending) {
      return;
    }

    const next = validateAll();

    if (Object.keys(next).length > 0) {
      showErrors(next);
      setStep(firstInvalidStep(next));
      return;
    }

    if (!payload || !method) {
      showErrors({ method: 'errors.providerUnavailable' });
      setStep(2);
      return;
    }

    submittedRef.current = true;
    idempotencyRef.current ??= crypto.randomUUID();
    mutation.mutate();
  }

  function primaryAction() {
    if (step < 3) {
      goNext();
      return;
    }

    formRef.current?.requestSubmit();
  }

  function errorText(key: string): string | undefined {
    const keyValue = errors[key];
    return keyValue ? t(keyValue) : undefined;
  }

  const uniqueErrors = [...new Set(Object.values(errors))];

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="grid gap-6 pb-28 lg:grid-cols-[1fr_380px] lg:pb-0"
    >
      <div className="min-w-0">
        <div className="lg:hidden">
          <MobileSummary
            product={product}
            products={products}
            presentation={presentation}
            locale={locale}
            quantity={quantity}
            onQuantityChange={updateQuantity}
            onProductChange={updateProduct}
            totalMinor={totalMinor}
          />
        </div>

        <ol className="mt-5 flex items-center gap-1 rounded-full bg-paper-white p-1.5 text-sm lg:mt-0">
          {STEPS.map((item, index) => {
            const active = step === index;
            const complete = step > index;

            return (
              <li key={item} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (index <= step) {
                      setStep(index as Step);
                    }
                  }}
                  disabled={index > step}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-full px-2 py-2 text-xs transition-colors sm:text-sm',
                    active && 'bg-ink-black text-paper-white',
                    complete && 'text-ink-black',
                    !active && !complete && 'text-slate-gray',
                    index > step && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
                      active && 'border-paper-white',
                      complete && 'border-ink-black bg-ink-black text-paper-white',
                    )}
                  >
                    {complete ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="hidden truncate sm:inline">{t(`steps.${item}`)}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <Card className="mt-5 bg-paper-white">
          <CardHeader>
            <p className="text-sm text-ash-gray">
              {String(step + 1).padStart(2, '0')} · {t(`steps.${STEPS[step]}`)}
            </p>
            <CardTitle>
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="text-body-lg font-medium outline-none"
              >
                {step === 0
                  ? t('contact.title')
                  : step === 1
                    ? t('delivery.title')
                    : step === 2
                      ? t('payment.title')
                      : t('review.title')}
              </h2>
            </CardTitle>
            <p className="text-sm text-slate-gray">
              {step === 0
                ? t('contact.description')
                : step === 1
                  ? t('delivery.description')
                  : step === 2
                    ? t('payment.description')
                    : t('review.description')}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {uniqueErrors.length > 0 ? (
              <div ref={errorSummaryRef} tabIndex={-1} className="outline-none">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{t('errors.summary')}</p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {uniqueErrors.map((key) => (
                        <li key={key}>{t(key)}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              </div>
            ) : null}

            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="email"
                  label={t('contact.email')}
                  error={errorText('email')}
                  className="sm:col-span-2"
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t('contact.emailPlaceholder')}
                    value={email}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      resetIdempotency();
                      clearError('email');
                    }}
                  />
                </Field>

                <Field id="name" label={t('contact.name')} error={errorText('name')}>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder={t('contact.namePlaceholder')}
                    value={name}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    onChange={(event) => {
                      setName(event.target.value);
                      resetIdempotency();
                      clearError('name');
                    }}
                  />
                </Field>

                <Field
                  id="phone"
                  label={t('contact.phone')}
                  hint={method?.requiresPhone ? t('contact.phoneHint') : t('contact.phoneOptional')}
                  error={errorText('phone')}
                >
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t('contact.phonePlaceholder')}
                    value={phone}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      resetIdempotency();
                      clearError('phone');
                    }}
                  />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="address1"
                  label={t('delivery.address1')}
                  error={errorText('address1')}
                  className="sm:col-span-2"
                >
                  <Input
                    id="address1"
                    autoComplete="address-line1"
                    placeholder={t('delivery.address1Placeholder')}
                    value={address1}
                    aria-invalid={Boolean(errors.address1)}
                    aria-describedby={errors.address1 ? 'address1-error' : undefined}
                    onChange={(event) => {
                      setAddress1(event.target.value);
                      resetIdempotency();
                      clearError('address1');
                    }}
                  />
                </Field>

                <Field id="address2" label={t('delivery.address2')} className="sm:col-span-2">
                  <Input
                    id="address2"
                    autoComplete="address-line2"
                    placeholder={t('delivery.address2Placeholder')}
                    value={address2}
                    onChange={(event) => {
                      setAddress2(event.target.value);
                      resetIdempotency();
                    }}
                  />
                </Field>

                <Field id="city" label={t('delivery.city')} error={errorText('city')}>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    placeholder={t('delivery.cityPlaceholder')}
                    value={city}
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={errors.city ? 'city-error' : undefined}
                    onChange={(event) => {
                      setCity(event.target.value);
                      resetIdempotency();
                      clearError('city');
                    }}
                  />
                </Field>

                <Field
                  id="postalCode"
                  label={t('delivery.postalCode')}
                  error={errorText('postalCode')}
                  hint={config.postalCodeRequired ? undefined : t('delivery.postalCodeOptional')}
                >
                  <Input
                    id="postalCode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    placeholder={t('delivery.postalCodePlaceholder')}
                    value={postalCode}
                    aria-invalid={Boolean(errors.postalCode)}
                    aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
                    onChange={(event) => {
                      setPostalCode(event.target.value);
                      resetIdempotency();
                      clearError('postalCode');
                    }}
                  />
                </Field>

                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('delivery.country')}</Label>
                  <div className="flex h-11 items-center rounded-md border border-input bg-fog-white px-4 text-base text-ink-black">
                    {common(config.country === 'FR' ? 'france' : 'senegal')}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-fog-white p-4 sm:col-span-2">
                  <Truck className="mt-0.5 size-4 shrink-0 text-ink-black" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-black">{t('delivery.standard')}</p>
                    <p className="text-sm text-slate-gray">{t('delivery.standardEta')}</p>
                  </div>
                  <Badge variant="success">{t('delivery.free')}</Badge>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <fieldset className="space-y-3">
                  <legend className="sr-only">{t('payment.description')}</legend>
                  <RadioGroup
                    value={method?.id ?? ''}
                    onValueChange={(value) => {
                      setMethodId(value);
                      resetIdempotency();
                      setErrors({});
                    }}
                    className="gap-2"
                  >
                    {methods.map((option) => (
                      <PaymentMethodOption
                        key={option.id}
                        option={option}
                        active={method?.id === option.id}
                      />
                    ))}
                  </RadioGroup>
                </fieldset>

                {method?.requiresPhone ? (
                  <Field
                    id="payment-phone"
                    label={t('contact.phone')}
                    hint={t('contact.phoneHint')}
                    error={errorText('phone')}
                  >
                    <Input
                      id="payment-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t('contact.phonePlaceholder')}
                      value={phone}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'payment-phone-error' : 'payment-phone-hint'}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        resetIdempotency();
                        clearError('phone');
                      }}
                    />
                  </Field>
                ) : null}

                {method?.mode === 'live' && method.id === 'card' ? (
                  <p className="flex items-start gap-2 rounded-2xl bg-fog-white p-4 text-sm text-slate-gray">
                    <Lock className="mt-0.5 size-4 shrink-0 text-ink-black" aria-hidden="true" />
                    {t('payment.secureNote')}
                  </p>
                ) : null}

                {method?.mode === 'demo' ? (
                  <p className="flex items-start gap-2 rounded-2xl bg-blush-peach p-4 text-sm text-sienna-brown">
                    <Beaker className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {t('payment.demoNote')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <ReviewRow label={t('review.customer')} onEdit={() => setStep(0)}>
                  <p className="text-sm text-ink-black">{name || '—'}</p>
                  <p className="text-sm text-slate-gray">{email || '—'}</p>
                  {phone ? <p className="text-sm text-slate-gray">{phone}</p> : null}
                </ReviewRow>

                <ReviewRow label={t('review.shipping')} onEdit={() => setStep(1)}>
                  <p className="text-sm text-ink-black">
                    {address1}
                    {address2 ? `, ${address2}` : ''}
                  </p>
                  <p className="text-sm text-slate-gray">
                    {postalCode ? `${postalCode} ` : ''}
                    {city}, {common(config.country === 'FR' ? 'france' : 'senegal')}
                  </p>
                </ReviewRow>

                <ReviewRow label={t('payment.title')} onEdit={() => setStep(2)}>
                  <p className="text-sm text-ink-black">{method ? rootT(method.labelKey) : '—'}</p>
                  {method?.mode === 'demo' ? (
                    <p className="text-sm text-slate-gray">{t('payment.demoNote')}</p>
                  ) : null}
                </ReviewRow>

                <div className="space-y-3 rounded-2xl bg-fog-white p-4">
                  <Label className="items-start gap-3 text-sm text-ink-black">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(event) => {
                        setTerms(event.target.checked);
                        resetIdempotency();
                        clearError('terms');
                      }}
                      aria-invalid={Boolean(errors.terms)}
                      aria-describedby={errors.terms ? 'terms-error' : undefined}
                      className="mt-0.5 size-4 shrink-0 accent-ink-black"
                    />
                    <span>{t('review.terms')}</span>
                  </Label>
                  {errors.terms ? (
                    <p id="terms-error" className="text-sm text-ink-black">
                      {t(errors.terms)}
                    </p>
                  ) : null}

                  <Label className="items-start gap-3 text-sm text-slate-gray">
                    <input
                      type="checkbox"
                      checked={marketing}
                      onChange={(event) => setMarketing(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-ink-black"
                    />
                    <span>{t('review.marketing')}</span>
                  </Label>
                </div>

                {generalError ? (
                  <Alert variant="destructive">
                    <p>{t(generalError)}</p>
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="hidden w-full lg:inline-flex"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {t('review.processing')}
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" aria-hidden="true" />
                      {t('review.pay', { amount: totalLabel })}
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={step === 0 || mutation.isPending}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t('review.back')}
              </Button>

              <Button
                type="button"
                onClick={goNext}
                disabled={step === 3 || mutation.isPending}
                className="hidden lg:inline-flex"
              >
                {common('continue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="hidden h-fit lg:sticky lg:top-8 lg:block">
        <Card className="bg-paper-white shadow-subtle-3">
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderSummaryContent
              idPrefix="desktop"
              product={product}
              products={products}
              presentation={presentation}
              locale={locale}
              quantity={quantity}
              onQuantityChange={updateQuantity}
              onProductChange={updateProduct}
              totalMinor={totalMinor}
            />
          </CardContent>
        </Card>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-gray">{t('summary.total')}</p>
            {product ? (
              <Money
                amountMinor={totalMinor.toString()}
                currency={product.currency}
                locale={locale}
                className="text-body-lg text-ink-black"
              />
            ) : null}
          </div>
          <Button
            type="button"
            size="lg"
            onClick={primaryAction}
            disabled={mutation.isPending}
            className="min-w-40"
          >
            {mutation.isPending
              ? t('review.processing')
              : step === 3
                ? t('review.pay', { amount: totalLabel })
                : common('continue')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-slate-gray">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-ink-black" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PaymentMethodOption({
  option,
  active,
}: {
  option: ShopperPaymentMethod;
  active: boolean;
}) {
  const t = useTranslations();
  const common = useTranslations('common');
  const Icon = icons[option.id];

  return (
    <Label
      htmlFor={`method-${option.id}`}
      className={cn(
        'flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors',
        active
          ? 'border-ink-black/20 bg-paper-white'
          : 'border-transparent bg-fog-white hover:bg-paper-white',
      )}
    >
      <Icon className="mt-1 size-5 shrink-0 text-ink-black" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base text-ink-black">{t(option.labelKey)}</span>
          {option.mode === 'demo' ? <Badge variant="neutral">{common('demo')}</Badge> : null}
        </span>
        <span className="mt-1 block text-sm text-slate-gray">{t(option.descriptionKey)}</span>
      </span>
      <RadioGroupItem value={option.id} id={`method-${option.id}`} className="mt-1" />
    </Label>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('common');

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-fog-white p-4">
      <div className="min-w-0">
        <p className="text-sm text-slate-gray">{label}</p>
        <div className="mt-1 space-y-0.5">{children}</div>
      </div>
      <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
        {t('edit')}
      </Button>
    </div>
  );
}

function OrderSummaryContent({
  idPrefix,
  product,
  products,
  presentation,
  locale,
  quantity,
  onQuantityChange,
  onProductChange,
  totalMinor,
}: {
  idPrefix: string;
  product: Product | undefined;
  products: Product[];
  presentation: ReturnType<typeof getProductPresentation>;
  locale: string;
  quantity: number;
  onQuantityChange: (value: string) => void;
  onProductChange: (value: string) => void;
  totalMinor: bigint;
}) {
  const t = useTranslations('checkout.summary');
  const common = useTranslations('common');

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-mist-gray text-sm text-slate-gray">
          {presentation?.brand ?? 'Orbit'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-black">{product.name}</p>
          {presentation ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-gray">
              {localized(presentation.tagline, locale)}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <Label htmlFor={`${idPrefix}-quantity`} className="text-sm text-slate-gray">
              {t('quantity')}
            </Label>
            <Select value={String(quantity)} onValueChange={onQuantityChange}>
              <SelectTrigger id={`${idPrefix}-quantity`} size="sm" className="w-20">
                <SelectValue>{quantity}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {products.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-product`}>{t('changeProduct')}</Label>
          <Select value={product.id} onValueChange={onProductChange}>
            <SelectTrigger id={`${idPrefix}-product`} className="w-full">
              <SelectValue>{product.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {products.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-gray">
          <span>{t('unitPrice')}</span>
          <Money amountMinor={product.amountMinor} currency={product.currency} locale={locale} />
        </div>
        <div className="flex justify-between text-slate-gray">
          <span>{t('quantity')}</span>
          <span className="tabular-nums">×{quantity}</span>
        </div>
        <div className="flex justify-between text-slate-gray">
          <span>{t('delivery')}</span>
          <span>{t('freeDelivery')}</span>
        </div>
      </div>

      <Separator />

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base text-ink-black">{t('total')}</span>
        <Money
          amountMinor={totalMinor.toString()}
          currency={product.currency}
          locale={locale}
          className="text-subheading text-ink-black"
        />
      </div>
      <p className="text-sm text-slate-gray">{t('taxesIncluded')}</p>

      <div className="rounded-3xl bg-blush-peach p-4 text-sienna-brown">
        <p className="flex items-center gap-2 text-sm">
          <Lock className="size-4" aria-hidden="true" />
          {common('secureCheckout')}
        </p>
        <p className="mt-1 text-sm">
          {locale === 'en'
            ? 'The API ignores client totals and recomputes from the catalog.'
            : 'L’API ignore le total client et recalcule depuis le catalogue.'}
        </p>
      </div>
    </div>
  );
}

function MobileSummary(props: {
  product: Product | undefined;
  products: Product[];
  presentation: ReturnType<typeof getProductPresentation>;
  locale: string;
  quantity: number;
  onQuantityChange: (value: string) => void;
  onProductChange: (value: string) => void;
  totalMinor: bigint;
}) {
  const t = useTranslations('checkout.summary');

  return (
    <Card className="bg-paper-white">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
          <span className="text-sm text-ink-black">{t('title')}</span>
          {props.product ? (
            <Money
              amountMinor={props.totalMinor.toString()}
              currency={props.product.currency}
              locale={props.locale}
              className="text-body-lg text-ink-black"
            />
          ) : null}
        </summary>
        <div className="px-5 pb-5">
          <OrderSummaryContent idPrefix="mobile" {...props} />
        </div>
      </details>
    </Card>
  );
}

function mapError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'errors.conflict';
    if (error.status === 502 || error.status === 503) return 'errors.providerUnavailable';
    if (error.status === 400) return 'errors.paymentFailed';
  }

  if (error instanceof TypeError) {
    return 'errors.network';
  }

  return 'errors.generic';
}
