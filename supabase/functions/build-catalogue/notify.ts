import { localize, type Localized } from '../_shared/core/index.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo takes at most 100 messages per request. */
const CHUNK = 100;

const TITLE = { en: 'Your question has an answer', hi: 'आपके प्रश्न का उत्तर आ गया है' };

/** A "tell me when it's answered" request whose question now has an answer in the app. */
export type AnsweredRequest = { requestId: string; userId: string; questionId: string; answerId: string; text: Localized };
export type PushToken = { token: string; user_id: string };
export type PushMessage = { to: string; title: string; body: string; data: { url: string }; sound: 'default' };

/** One message per registered phone, in the person's app language; tapping it opens the answer. */
export function pushMessages(
  requests: AnsweredRequest[],
  tokens: PushToken[],
  languages: Map<string, 'en' | 'hi'>,
): PushMessage[] {
  return requests.flatMap((request) => {
    const language = languages.get(request.userId) ?? 'en';
    return tokens
      .filter((t) => t.user_id === request.userId)
      .map((t) => ({
        to: t.token,
        title: TITLE[language],
        body: localize(request.text, language),
        data: { url: `/answer/${request.answerId}` },
        sound: 'default' as const,
      }));
  });
}

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

/**
 * Sends through Expo's push service. Returns how many were accepted and
 * the tokens of phones that uninstalled the app, which should be deleted.
 */
export async function sendPushes(
  messages: PushMessage[],
  options: { fetch?: (input: string, init?: RequestInit) => Promise<Response>; accessToken?: string } = {},
): Promise<{ sent: number; unregistered: string[] }> {
  const send = options.fetch ?? fetch;
  let sent = 0;
  const unregistered: string[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const response = await send(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) throw new Error(`Expo push service answered ${response.status}`);
    const { data = [] } = (await response.json()) as { data?: Ticket[] };
    data.forEach((ticket, j) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') unregistered.push(chunk[j]!.to);
    });
  }
  return { sent, unregistered };
}
