import crypto from 'crypto';

export const createId = (prefix = 'id'): string => `${prefix}_${crypto.randomUUID()}`;
