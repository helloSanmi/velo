import type { GraphMessageHeader } from './tickets.graph.types.js';

export const extractHeaderValue = (headers: GraphMessageHeader[] | undefined, name: string): string | undefined =>
  headers?.find((header) => String(header?.name || '').toLowerCase() === name.toLowerCase())?.value;

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripHtml = (value: string): string =>
  decodeHtmlEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );

const normalizeWhitespace = (value: string): string =>
  value
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

const trimQuotedReply = (value: string): string => {
  const lines = value.split('\n');
  const keep: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^>/.test(line)) break;
    if (/^on .+wrote:$/i.test(line)) break;
    if (/^from:\s/i.test(line)) break;
    if (/^sent:\s/i.test(line)) break;
    if (/^subject:\s/i.test(line)) break;
    if (/^to:\s/i.test(line)) break;
    if (/^--\s*$/.test(line)) break;
    keep.push(line);
  }
  return normalizeWhitespace(keep.join('\n'));
};

export const extractCommentTextFromMessage = (row: any): string => {
  const candidates: string[] = [];
  const body = typeof row?.body?.content === 'string' ? row.body.content : '';
  const uniqueBody = typeof row?.uniqueBody?.content === 'string' ? row.uniqueBody.content : '';
  const preview = typeof row?.bodyPreview === 'string' ? row.bodyPreview : '';
  if (body) candidates.push(stripHtml(body));
  if (uniqueBody) candidates.push(stripHtml(uniqueBody));
  if (preview) candidates.push(preview);
  const primary = candidates.find((item) => normalizeWhitespace(item).length > 0) || '';
  const trimmed = trimQuotedReply(primary);
  return trimmed.slice(0, 4000).trim();
};

const tryExtractTicketId = (value: string): string | undefined => {
  const input = String(value || '');
  const byCodeBracket = input.match(/\[([A-Z0-9]{3}-\d{6})\]/i)?.[1];
  if (byCodeBracket) return byCodeBracket.toUpperCase();
  const byBracket = input.match(/\[TKT:([A-Za-z0-9_-]+)\]/i)?.[1];
  if (byBracket) return byBracket;
  const byHeader = input.match(/x-velo-ticket-id[:\s]+([A-Za-z0-9_-]+)/i)?.[1];
  if (byHeader) return byHeader;
  const byThreadKey = input.match(/ticket-([A-Za-z0-9_-]+)/i)?.[1];
  if (byThreadKey) return byThreadKey;
  const byUrl = input.match(/[?&]tickets=([A-Za-z0-9_-]+)/i)?.[1];
  if (byUrl) return byUrl;
  const byLegacy = input.match(/tkt[_-]([A-Za-z0-9_-]+)/i)?.[1];
  if (byLegacy) return byLegacy;
  return undefined;
};

export const extractTicketIdFromMessage = (input: {
  subject?: string;
  headers?: GraphMessageHeader[];
  conversationId?: string;
  inReplyTo?: string;
  references?: string;
}): string | undefined => {
  const fromHeader = extractHeaderValue(input.headers, 'x-velo-ticket-id');
  if (fromHeader && fromHeader.trim()) return fromHeader.trim();
  const fromThreadHeader = extractHeaderValue(input.headers, 'x-velo-thread-key');
  const headerBlob = (input.headers || []).map((header) => `${header?.name || ''}: ${header?.value || ''}`).join('\n');
  const combined = [
    String(input.subject || ''),
    String(input.references || ''),
    String(input.inReplyTo || ''),
    String(input.conversationId || ''),
    String(fromThreadHeader || ''),
    headerBlob
  ]
    .filter(Boolean)
    .join('\n');
  return tryExtractTicketId(combined);
};
