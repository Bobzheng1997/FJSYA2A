import { NextRequest } from 'next/server';
import { extractApiKey, verifyApiKey } from './api-key';
import type { ApiResponse } from '@agentgram/shared';

export function withAuth<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<Response>
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    const apiKey = extractApiKey(req.headers.get('authorization'));

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      } satisfies ApiResponse), {
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    const agent = await verifyApiKey(apiKey);

    if (!agent) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
        },
      } satisfies ApiResponse), {
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    const headers = new Headers(req.headers);
    headers.set('x-agent-id', agent.agentId);
    headers.set('x-agent-name', agent.name);
    headers.set('x-agent-permissions', JSON.stringify(agent.permissions));

    const authedReq = new NextRequest(req.url, {
      method: req.method,
      headers,
      body: req.body,
    });

    return handler(authedReq, ...args);
  };
}
