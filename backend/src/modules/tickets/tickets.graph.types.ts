export type GraphConnectionMetadata = {
  teamsTeamId?: string;
  teamsChannelId?: string;
  teamsChatId?: string;
  mailSubscriptionId?: string;
  mailSubscriptionExpiresAt?: string;
  mailDeltaLink?: string;
  mailWebhookClientState?: string;
  lastMailDeltaSyncAt?: string;
  lastMailWebhookAt?: string;
  webhookClientStateMismatchCount24h?: number;
  lastWebhookClientStateMismatchAt?: string;
  inboundDuplicateDropCount24h?: number;
  lastInboundDuplicateDropAt?: string;
  graphThrottleCount24h?: number;
  lastGraphThrottleAt?: string;
  graphConsecutiveFailures?: number;
  graphCircuitBreakerUntil?: string;
  graphCircuitBreakerReason?: string;
  refreshTokenPresent?: boolean;
  lastTokenRefreshAt?: string;
  lastTokenRefreshStatus?: 'ok' | 'temporary_failure' | 'reconsent_required';
  lastTokenRefreshError?: string;
};

export type GraphAuthMode = 'app_only' | 'delegated';
export type GraphAuthContext = {
  accessToken: string;
  mode: GraphAuthMode;
  tenantId?: string;
};

export type GraphMessageHeader = { name?: string; value?: string };
