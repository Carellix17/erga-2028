import { Environment, Paddle, EventName } from 'npm:@paddle/paddle-node-sdk';

export { EventName };

export type PaddleEnv = 'sandbox' | 'live';

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev/paddle';

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === 'sandbox'
    ? Deno.env.get('PADDLE_SANDBOX_API_KEY')!
    : Deno.env.get('PADDLE_LIVE_API_KEY')!;
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      'X-Connection-Api-Key': connectionApiKey,
      'Lovable-API-Key': lovableApiKey,
    },
  });
}

export async function gatewayFetch(env: PaddleEnv, path: string, init?: RequestInit): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Connection-Api-Key': connectionApiKey,
      'Lovable-API-Key': lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === 'sandbox'
    ? Deno.env.get('PAYMENTS_SANDBOX_WEBHOOK_SECRET')!
    : Deno.env.get('PAYMENTS_LIVE_WEBHOOK_SECRET')!;
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get('paddle-signature');
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) {
    throw new Error('Missing signature or body');
  }

  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}
