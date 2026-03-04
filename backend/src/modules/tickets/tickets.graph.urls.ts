import { env } from '../../config/env.js';

export const buildTicketUrl = (ticketId: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/app?tickets=${encodeURIComponent(ticketId)}`;

export const buildAppUrl = (path: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}${path}`;
