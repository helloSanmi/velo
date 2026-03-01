import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('14d'),
  SESSION_MAX_DAYS: z.coerce.number().default(30),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  AI_DEFAULT_DAILY_REQUEST_LIMIT: z.coerce.number().default(10),
  AI_DEFAULT_DAILY_TOKEN_LIMIT: z.coerce.number().default(50000),
  AI_GRACE_REQUESTS: z.coerce.number().default(2),
  AI_GRACE_TOKENS: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RETENTION_CLEANUP_ENABLED: z.coerce.boolean().default(true),
  RETENTION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().default(1440),
  RETENTION_ORG_DELETE_DAYS: z.coerce.number().default(30),
  RETENTION_PROJECT_DELETE_AUDIT_DAYS: z.coerce.number().default(30),
  RETENTION_TICKET_NOTIFICATION_DELIVERY_DAYS: z.coerce.number().default(30),
  RETENTION_TICKET_INBOUND_MESSAGE_DAYS: z.coerce.number().default(30),
  RETENTION_TICKET_SUPPRESSION_DAYS: z.coerce.number().default(30),
  TICKETS_SUBSCRIPTION_RENEWAL_ENABLED: z.coerce.boolean().default(true),
  TICKETS_SUBSCRIPTION_RENEWAL_INTERVAL_MINUTES: z.coerce.number().default(15),
  TICKETS_SUBSCRIPTION_RENEW_BEFORE_MINUTES: z.coerce.number().default(180),
  TICKETS_DELTA_SYNC_FALLBACK_ENABLED: z.coerce.boolean().default(true),
  TICKETS_DELTA_SYNC_FALLBACK_INTERVAL_MINUTES: z.coerce.number().default(5),
  TICKETS_NOTIFICATION_QUEUE_ENABLED: z.coerce.boolean().default(true),
  TICKETS_NOTIFICATION_QUEUE_POLL_MS: z.coerce.number().default(3000),
  TICKETS_NOTIFICATION_DIGEST_FLUSH_MS: z.coerce.number().default(60000),
  APP_BASE_URL: z.string().default('http://localhost:4000'),
  FRONTEND_BASE_URL: z.string().default('http://localhost:3000'),
  MICROSOFT_OAUTH_CLIENT_ID: z.string().optional(),
  MICROSOFT_OAUTH_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_OAUTH_REDIRECT_URI: z.string().optional(),
  MICROSOFT_GRAPH_APP_ONLY_ENABLED: z.coerce.boolean().default(true),
  MICROSOFT_GRAPH_APP_ONLY_STRICT: z.coerce.boolean().default(false),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_OAUTH_REDIRECT_URI: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_REDIRECT_URI: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional()
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const validateProductionGuards = (input: z.infer<typeof EnvSchema>) => {
  if (input.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  const accessSecret = input.JWT_ACCESS_SECRET || '';
  const refreshSecret = input.JWT_REFRESH_SECRET || '';
  if (accessSecret.length < 32) problems.push('JWT_ACCESS_SECRET must be at least 32 characters in production.');
  if (refreshSecret.length < 32) problems.push('JWT_REFRESH_SECRET must be at least 32 characters in production.');

  const isUnsafeUrl = (value: string) => {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      const localHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
      return localHost || url.protocol !== 'https:';
    } catch {
      return true;
    }
  };

  if (isUnsafeUrl(input.APP_BASE_URL)) {
    problems.push('APP_BASE_URL must be a valid HTTPS non-localhost URL in production.');
  }
  if (isUnsafeUrl(input.FRONTEND_BASE_URL)) {
    problems.push('FRONTEND_BASE_URL must be a valid HTTPS non-localhost URL in production.');
  }

  const corsOrigins = input.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const hasUnsafeCors = corsOrigins.some((origin) => isUnsafeUrl(origin));
  if (hasUnsafeCors) {
    problems.push('CORS_ORIGIN must contain only HTTPS non-localhost origins in production.');
  }

  if (problems.length > 0) {
    console.error('Invalid production security configuration', problems);
    process.exit(1);
  }
};

validateProductionGuards(parsed.data);

export const env = parsed.data;
