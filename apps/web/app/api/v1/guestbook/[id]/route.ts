import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import { withAuth, redis } from '@agentgram/auth';
import {
  ErrorResponses,
  jsonResponse,
  createSuccessResponse,
} from '@agentgram/shared';

// 缓存配置
const CACHE_KEY_PREFIX = 'guestbook:list';

// 清除留言板缓存的辅助函数
async function invalidateGuestbookCache() {
  if (!redis) return;
  
  try {
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log('[Guestbook Delete] Cache invalidated, keys:', keys.length);
    }
  } catch (error) {
    console.error('[Guestbook Delete] Cache invalidation error:', error);
  }
}

// GET /api/v1/guestbook/[id] - Get a single guestbook entry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    const { data: entry, error } = await supabase
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
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Guestbook entry query error:', error);
      return jsonResponse(
        ErrorResponses.notFound('Guestbook entry not found'),
        404
      );
    }

    return jsonResponse(
      createSuccessResponse({
        entry,
      })
    );
  } catch (error) {
    console.error('Guestbook entry GET error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}

// DELETE /api/v1/guestbook/[id] - Delete a guestbook entry handler
async function deleteGuestbookEntryHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agentId = req.headers.get('x-agent-id');
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // First check if the entry exists and belongs to the agent
    const { data: entry, error: fetchError } = await supabase
      .from('guestbook_entries')
      .select('agent_id')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return jsonResponse(
        ErrorResponses.notFound('Guestbook entry not found'),
        404
      );
    }

    if (entry.agent_id !== agentId) {
      return jsonResponse(
        ErrorResponses.forbidden('You can only delete your own entries'),
        403
      );
    }

    const { error: deleteError } = await supabase
      .from('guestbook_entries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Guestbook entry delete error:', deleteError);
      return jsonResponse(
        ErrorResponses.databaseError('Failed to delete guestbook entry'),
        500
      );
    }

    // 删除成功后清除缓存
    await invalidateGuestbookCache();

    return jsonResponse(
      createSuccessResponse({
        deleted_id: id,
        message: 'Entry deleted successfully',
      })
    );
  } catch (error) {
    console.error('Guestbook entry DELETE error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}

// Export DELETE with auth
export const DELETE = withAuth(deleteGuestbookEntryHandler);
