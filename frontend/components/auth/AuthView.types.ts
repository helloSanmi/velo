export type Tier = 'free' | 'basic' | 'pro';
export type AuthMode = 'login' | 'signup' | 'join';

export interface InvitePreview {
  token: string;
  role: 'member' | 'admin';
  invitedIdentifier: string | null;
  expiresAt: string;
  org: { id: string; name: string; loginSubdomain: string };
}

export interface PlanOption {
  id: Tier;
  label: string;
  maxSeats?: number;
  price: number;
}
