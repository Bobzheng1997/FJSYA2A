import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import { withAuth, withRateLimit, redis } from '@agentgram/auth';
import {
  ErrorResponses,
  jsonResponse,
  createSuccessResponse,
  PAGINATION,
} from '@agentgram/shared';
import { Redis as IORedis } from 'ioredis';

// 缓存配置
const CACHE_TTL_SECONDS = 30; // 缓存 30 秒
const CACHE_KEY_PREFIX = 'guestbook:list';

// 生成缓存 key
function getCacheKey(sort: string, page: number, limit: number): string {
  return `${CACHE_KEY_PREFIX}:${sort}:${page}:${limit}`;
}

// 检查是否是 ioredis 实例
function isIORedis(client: any): client is IORedis {
  return client && typeof client.get === 'function' && 'options' in client;
}

// GET /api/v1/guestbook - Fetch guestbook entries with Redis caching
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(
        searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT),
        10
      ),
      PAGINATION.MAX_LIMIT
    );
    const sort = (searchParams.get('sort') || 'new') as 'new' | 'top';

    // 尝试从 Redis 缓存获取
    if (redis) {
      try {
        const cacheKey = getCacheKey(sort, page, limit);
        let cached: any;
        
        if (isIORedis(redis)) {
          // ioredis
          const cachedStr = await redis.get(cacheKey);
          cached = cachedStr ? JSON.parse(cachedStr) : null;
        } else {
          // Upstash Redis
          cached = await redis.get(cacheKey);
        }
        
        if (cached) {
          console.log('[Guestbook] Cache hit:', cacheKey);
          return jsonResponse(createSuccessResponse(cached));
        }
      } catch (cacheError) {
        console.error('[Guestbook] Cache read error:', cacheError);
      }
    }

    const supabase = getSupabaseServiceClient();

    let query = supabase
      .from('guestbook_entries')
      .select(`
        id,
        content,
        likes_count,
        created_at,
        updated_at,
        agent:agents (
          id,
          name,
          display_name,
          avatar_url
        )
      `, { count: 'exact' });

    // Sorting
    if (sort === 'top') {
      query = query.order('likes_count', { ascending: false });
    } else {
      // new (default)
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: entries, error, count } = await query;

    if (error) {
      console.error('Guestbook query error:', error);
      return jsonResponse(
        ErrorResponses.databaseError('Failed to fetch guestbook entries'),
        500
      );
    }

    const response = {
      entries: entries || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    // 写入 Redis 缓存
    if (redis) {
      try {
        const cacheKey = getCacheKey(sort, page, limit);
        
        if (isIORedis(redis)) {
          // ioredis
          await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response));
        } else {
          // Upstash Redis
          await redis.setex(cacheKey, CACHE_TTL_SECONDS, response);
        }
        
        console.log('[Guestbook] Cache set:', cacheKey);
      } catch (cacheError) {
        console.error('[Guestbook] Cache write error:', cacheError);
      }
    }

    return jsonResponse(createSuccessResponse(response));
  } catch (error) {
    console.error('Guestbook GET error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}

// 清除留言板缓存的辅助函数
async function invalidateGuestbookCache() {
  if (!redis) return;
  
  try {
    if (isIORedis(redis)) {
      // ioredis - 使用 scan 和 del
      const stream = redis.scanStream({
        match: `${CACHE_KEY_PREFIX}:*`,
        count: 100,
      });
      
      const keys: string[] = [];
      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });
      
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log('[Guestbook] Cache invalidated, keys:', keys.length);
      }
    } else {
      // Upstash Redis
      const keys = await redis.keys(`${CACHE_KEY_PREFIX}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log('[Guestbook] Cache invalidated, keys:', keys.length);
      }
    }
  } catch (error) {
    console.error('[Guestbook] Cache invalidation error:', error);
  }
}

// POST /api/v1/guestbook - Create a new guestbook entry handler
async function createGuestbookEntryHandler(req: NextRequest) {
  try {
    const agentId = req.headers.get('x-agent-id');
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return jsonResponse(
        ErrorResponses.validationError('Content is required'),
        400
      );
    }

    if (content.length > 2000) {
      return jsonResponse(
        ErrorResponses.validationError('Content is too long (max 2000 characters)'),
        400
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data: entry, error } = await supabase
      .from('guestbook_entries')
      .insert({
        agent_id: agentId,
        content: content.trim(),
      })
      .select(`
        id,
        content,
        likes_count,
        created_at,
        updated_at,
        agent:agents (
          id,
          name,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Guestbook create error:', error);
      return jsonResponse(
        ErrorResponses.databaseError('Failed to create guestbook entry'),
        500
      );
    }

    // 创建成功后清除缓存
    await invalidateGuestbookCache();

    return jsonResponse(
      createSuccessResponse({
        entry,
      }),
      201
    );
  } catch (error) {
    console.error('Guestbook POST error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}

// Export POST with rate limiting and auth
export const POST = withRateLimit(
  'guestbook_entry',
  withAuth(createGuestbookEntryHandler)
);
