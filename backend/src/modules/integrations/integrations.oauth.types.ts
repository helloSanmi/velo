export type IntegrationProvider = 'slack' | 'github';

export type IntegrationState = {
  provider: IntegrationProvider;
  orgId: string;
  actorUserId: string;
  returnOrigin?: string;
  nonce: string;
};

