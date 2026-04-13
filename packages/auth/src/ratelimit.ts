import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@agentgram/shared';
import {
  RATE_LIMITS,
  API_KEY_REGEX,
  API_KEY_MAX_LENGTH,
  API_KEY_PREFIX_LENGTH,
} from '@agentgram/shared';
import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IORedis } from 'ioredis';

/**
 * Rate limiting middleware for API routes
 *
 * Uses Upstash Redis when configured and falls back to in-memory storage
 * in development environments where Upstash is not configured.
 * Also supports local Redis via ioredis.
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes to prevent memory leak
// Only active when in-memory fallback is used (redis === null)
function startCleanupInterval() {
  const handle = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of Array.from(rateLimitMap.entries())) {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );
  handle.unref();
}

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitOptions> = {
  registration: {
    maxRequests: RATE_LIMITS.REGISTRATION.limit,
    windowMs: RATE_LIMITS.REGISTRATION.windowMs,
  },
  post: {
    maxRequests: RATE_LIMITS.POST_CREATE.limit,
    windowMs: RATE_LIMITS.POST_CREATE.windowMs,
  },
  comment: {
    maxRequests: RATE_LIMITS.COMMENT_CREATE.limit,
    windowMs: RATE_LIMITS.COMMENT_CREATE.windowMs,
  },
  vote: {
    maxRequests: RATE_LIMITS.VOTE.limit,
    windowMs: RATE_LIMITS.VOTE.windowMs,
  },
  follow: {
    maxRequests: RATE_LIMITS.FOLLOW.limit,
    windowMs: RATE_LIMITS.FOLLOW.windowMs,
  },
  notification: {
    maxRequests: RATE_LIMITS.NOTIFICATION_READ.limit,
    windowMs: RATE_LIMITS.NOTIFICATION_READ.windowMs,
  },
  persona: {
    maxRequests: RATE_LIMITS.PERSONA.limit,
    windowMs: RATE_LIMITS.PERSONA.windowMs,
  },
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
};

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const localRedisUrl = process.env.REDIS_URL?.trim();

// 支持 Upstash Redis 或本地 Redis
let redis: UpstashRedis | IORedis | null = null;
let redisType: 'upstash' | 'local' | 'none' = 'none';

if (upstashUrl && upstashToken) {
  // 使用 Upstash Redis
  redis = new UpstashRedis({
    url: upstashUrl,
    token: upstashToken,
  });
  redisType = 'upstash';
  console.log('[agentgram:ratelimit] Using Upstash Redis');
} else if (localRedisUrl) {
  // 使用本地 Redis
  try {
    redis = new IORedis(localRedisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
    redisType = 'local';
    console.log('[agentgram:ratelimit] Using local Redis');
    
    // 监听连接错误
    redis.on('error', (err) => {
      console.error('[agentgram:ratelimit] Local Redis error:', err);
    });
  } catch (error) {
    console.error('[agentgram:ratelimit] Failed to connect to local Redis:', error);
    redis = null;
  }
}

if (!redis && process.env.NODE_ENV === 'production') {
  console.error(
    '[agentgram:ratelimit] Redis not configured in production. ' +
      'Mutation endpoints will reject requests (fail-closed). ' +
      'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or REDIS_URL.'
  );
}

/**
 * Rate limit types that must fail-closed (reject) when Redis is unavailable
 * in production. Read-only endpoints still fall back to in-memory limiting.
 */
const FAIL_CLOSED_TYPES = new Set([
  'registration',
  'post',
  'comment',
  'vote',
  'follow',
]);

if (!redis) {
  startCleanupInterval();
}

const upstashLimiters = new Map<string, Ratelimit>();
type SlidingWindowFactory = (
  tokens: Duration,
  window: Duration
) => ReturnType<typeof Ratelimit.slidingWindow>;
const createSlidingWindow: SlidingWindowFactory = (tokens, window) =>
  (
    Ratelimit as unknown as { slidingWindow: SlidingWindowFactory }
  ).slidingWindow(tokens, window);

function getLimiter(options: RateLimitOptions) {
  if (!redis || redisType !== 'upstash') {
    return null;
  }

  const key = `${options.maxRequests}:${options.windowMs}`;
  const existing = upstashLimiters.get(key);
  if (existing) {
    return existing;
  }

  const window = toDuration(options.windowMs);
  const limiter = new Ratelimit({
    redis: redis as UpstashRedis,
    limiter: createSlidingWindow(
      options.maxRequests as unknown as Duration,
      window
    ),
    analytics: true,
  });

  upstashLimiters.set(key, limiter);
  return limiter;
}

function toUnixSeconds(reset: number) {
  return reset < 1_000_000_000_000 ? reset : Math.ceil(reset / 1000);
}

function getRetryAfterSeconds(resetSeconds: number) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.max(0, resetSeconds - nowSeconds);
}

/**
 * Extract client IP from request headers.
 *
 * On Vercel, x-forwarded-for is set by the platform edge and cannot be
 * spoofed by end users. For non-Vercel deployments behind untrusted
 * proxies, consider restricting to x-real-ip or a platform-specific header.
 */
function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return req.headers.get('x-real-ip') || 'unknown';
}

function getApiKeyPrefix(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (token.length > API_KEY_MAX_LENGTH || !API_KEY_REGEX.test(token)) {
    return null;
  }

  return token.substring(0, API_KEY_PREFIX_LENGTH);
}

/**
 * Normalize pathname for rate limiting to prevent cardinality explosion.
 * Replaces dynamic segments (UUIDs, numeric IDs) with placeholders.
 */
function normalizePathname(pathname: string): string {
  return pathname
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id'
    )
    .replace(/\/[0-9a-f]{24,}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

function getLimitData(key: string, now: number, windowMs: number) {
  let limitData = rateLimitMap.get(key);

  if (!limitData || now > limitData.resetTime) {
    limitData = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(key, limitData);
  }

  return limitData;
}

function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetSeconds: number
) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetSeconds.toString(),
  };
}

function withRateLimitHeaders(
  response: Response,
  headers: Record<string, string>,
  retryAfterSeconds?: number
) {
  const updatedHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(headers)) {
    updatedHeaders.set(key, value);
  }

  if (retryAfterSeconds !== undefined) {
    updatedHeaders.set('Retry-After', retryAfterSeconds.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: updatedHeaders,
  });
}

function toDuration(windowMs: number): Duration {
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  const secondMs = 1000;

  if (windowMs % dayMs === 0) {
    return `${windowMs / dayMs} d` as Duration;
  }

  if (windowMs % hourMs === 0) {
    return `${windowMs / hourMs} h` as Duration;
  }

  if (windowMs % minuteMs === 0) {
    return `${windowMs / minuteMs} m` as Duration;
  }

  return `${Math.ceil(windowMs / secondMs)} s` as Duration;
}

// 本地 Redis 限流实现
async function checkLocalRedisLimit(
  redisClient: IORedis,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const windowSeconds = Math.ceil(windowMs / 1000);
  
  try {
    // 使用 Redis 的 sorted set 实现滑动窗口
    const pipeline = redisClient.pipeline();
    
    // 移除窗口外的旧记录
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    
    // 获取当前窗口内的请求数
    pipeline.zcard(key);
    
    // 添加当前请求
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // 设置过期时间
    pipeline.expire(key, windowSeconds);
    
    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;
    
    const success = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const reset = Math.ceil((now + windowMs) / 1000);
    
    return { success, limit: maxRequests, remaining, reset };
  } catch (error) {
    console.error('[agentgram:ratelimit] Local Redis limit check failed:', error);
    // 失败时允许请求通过（fail-open）
    return { success: true, limit: maxRequests, remaining: 0, reset: Math.ceil((now + windowMs) / 1000) };
  }
}

/**
 * Rate limiting middleware wrapper
 * @param limitType - Predefined limit type or custom options
 * @param handler - Request handler function
 */
export function withRateLimit<T extends unknown[]>(
  limitType: string | RateLimitOptions,
  handler: (req: NextRequest, ...args: T) => Promise<Response>
): (req: NextRequest, ...args: T) => Promise<Response> {
  const typeName = typeof limitType === 'string' ? limitType : 'custom';
  const options: RateLimitOptions =
    typeof limitType === 'string'
      ? RATE_LIMIT_CONFIGS[limitType] || RATE_LIMIT_CONFIGS.default
      : limitType;

  const { maxRequests, windowMs } = options;

  return async (req: NextRequest, ...args: T) => {
    // Vercel sets x-forwarded-for reliably in production.
    const ip = getClientIp(req);
    const rawPathname = new URL(req.url).pathname;
    const pathname = normalizePathname(rawPathname);
    const key = `${ip}:${pathname}`;
    const keyPrefix = getApiKeyPrefix(req.headers.get('authorization'));
    const keyPrefixKey = keyPrefix
      ? `key-prefix:${keyPrefix}:${pathname}`
      : null;
    const limiter = getLimiter(options);

    // Fail-closed: reject mutation endpoints when Redis is unavailable in production
    if (
      !redis &&
      process.env.NODE_ENV === 'production' &&
      FAIL_CLOSED_TYPES.has(typeName)
    ) {
      console.error(
        `[agentgram:ratelimit] Rejecting ${typeName} request: Redis unavailable (fail-closed)`
      );
      return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message:
              'Service temporarily unavailable. Please try again later.',
          },
        } satisfies ApiResponse), {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': '60',
          },
        }
      );
    }

    // Upstash Redis 限流
    if (limiter && redisType === 'upstash') {
      const result = await limiter.limit(key);
      const resetSeconds = toUnixSeconds(result.reset);
      const rateLimitHeaders = buildRateLimitHeaders(
        result.limit,
        result.remaining,
        resetSeconds
      );
      if (!result.success) {
        const retryAfterSeconds = getRetryAfterSeconds(resetSeconds);
        return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again later.',
            },
          } satisfies ApiResponse), {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...rateLimitHeaders,
              'Retry-After': retryAfterSeconds.toString(),
            },
          }
        );
      }

      if (keyPrefixKey) {
        const prefixResult = await limiter.limit(keyPrefixKey);
        const prefixResetSeconds = toUnixSeconds(prefixResult.reset);
        const prefixHeaders = buildRateLimitHeaders(
          prefixResult.limit,
          prefixResult.remaining,
          prefixResetSeconds
        );

        if (!prefixResult.success) {
          const retryAfterSeconds = getRetryAfterSeconds(prefixResetSeconds);
          return new Response(JSON.stringify({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Please try again later.',
              },
            } satisfies ApiResponse), {
              status: 429,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...prefixHeaders,
                'Retry-After': retryAfterSeconds.toString(),
              },
            }
          );
        }
      }

      const response = await handler(req, ...args);
      return withRateLimitHeaders(response, rateLimitHeaders);
    }

    // 本地 Redis 限流
    if (redis && redisType === 'local') {
      const redisClient = redis as IORedis;
      const result = await checkLocalRedisLimit(redisClient, key, maxRequests, windowMs);
      const resetSeconds = result.reset;
      const rateLimitHeaders = buildRateLimitHeaders(
        result.limit,
        result.remaining,
        resetSeconds
      );
      
      if (!result.success) {
        const retryAfterSeconds = getRetryAfterSeconds(resetSeconds);
        return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again later.',
            },
          } satisfies ApiResponse), {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...rateLimitHeaders,
              'Retry-After': retryAfterSeconds.toString(),
            },
          }
        );
      }

      if (keyPrefixKey) {
        const prefixResult = await checkLocalRedisLimit(redisClient, keyPrefixKey, maxRequests, windowMs);
        const prefixResetSeconds = prefixResult.reset;
        const prefixHeaders = buildRateLimitHeaders(
          prefixResult.limit,
          prefixResult.remaining,
          prefixResetSeconds
        );

        if (!prefixResult.success) {
          const retryAfterSeconds = getRetryAfterSeconds(prefixResetSeconds);
          return new Response(JSON.stringify({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Please try again later.',
              },
            } satisfies ApiResponse), {
              status: 429,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...prefixHeaders,
                'Retry-After': retryAfterSeconds.toString(),
              },
            }
          );
        }
      }

      const response = await handler(req, ...args);
      return withRateLimitHeaders(response, rateLimitHeaders);
    }

    // 内存限流（fallback）
    const now = Date.now();
    const limitData = getLimitData(key, now, windowMs);
    limitData.count++;

    const remaining = Math.max(0, maxRequests - limitData.count);
    const resetSeconds = Math.ceil(limitData.resetTime / 1000);
    const rateLimitHeaders = buildRateLimitHeaders(
      maxRequests,
      remaining,
      resetSeconds
    );

    if (limitData.count > maxRequests) {
      const retryAfterSeconds = getRetryAfterSeconds(resetSeconds);
      return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Please try again later.',
          },
        } satisfies ApiResponse), {
          status: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...rateLimitHeaders,
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    if (keyPrefixKey) {
      const prefixLimit = getLimitData(keyPrefixKey, now, windowMs);
      prefixLimit.count++;
      const prefixRemaining = Math.max(0, maxRequests - prefixLimit.count);
      const prefixResetSeconds = Math.ceil(prefixLimit.resetTime / 1000);
      const prefixHeaders = buildRateLimitHeaders(
        maxRequests,
        prefixRemaining,
        prefixResetSeconds
      );

      if (prefixLimit.count > maxRequests) {
        const retryAfterSeconds = getRetryAfterSeconds(prefixResetSeconds);
        return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again later.',
            },
          } satisfies ApiResponse), {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...prefixHeaders,
              'Retry-After': retryAfterSeconds.toString(),
            },
          }
        );
      }
    }

    const response = await handler(req, ...args);
    return withRateLimitHeaders(response, rateLimitHeaders);
  };
}

// 导出 redis 实例供其他模块使用
export { redis };
