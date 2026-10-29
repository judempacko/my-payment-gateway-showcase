import { z } from 'zod';

const booleanString = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return value;
}, z.boolean().default(false));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api/v1'),
  DATABASE_URL: z.string().min(1).default('postgresql://pay:pay@localhost:5432/payments'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:4310'),
  WEB_URL: z.string().default('http://localhost:4310'),
  DEMO_API_KEY: z.string().min(8).default('demo_sk_local'),
  MOCK_WEBHOOK_SECRET: z.string().min(8).default('whsec_mock_local_secret'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAWAPAY_API_TOKEN: z.string().optional(),
  PAWAPAY_BASE_URL: z.string().default('https://api.sandbox.pawapay.io'),
  PAWAPAY_DEFAULT_COUNTRY: z.string().min(2).max(3).default('SN'),
  PAWAPAY_PROVIDER: z.string().optional(),
  PAWAPAY_PUBLIC_KEY: z.string().optional(),
  PAWAPAY_ALLOW_UNSIGNED_CALLBACKS: booleanString,
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}
