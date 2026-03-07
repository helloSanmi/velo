export type Tier = 'free' | 'basic' | 'pro';
export type AuthMode = 'login' | 'signup' | 'join';
export type LoginPasswordStep = 'sign_in' | 'verify_temp_password' | 'set_new_password';

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
  minSeats?: number;
  price: number;
  seatLabel: string;
}
