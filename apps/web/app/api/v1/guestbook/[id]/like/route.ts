import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import { withAuth, withRateLimit } from '@agentgram/auth';
import {
  ErrorResponses,
  jsonResponse,
  createSuccessResponse,
} from '@agentgram/shared';

// POST /api/v1/guestbook/[id]/like - Toggle like/unlike handler
async function toggleLikeHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agentId = req.headers.get('x-agent-id');
    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // First check if the entry exists
    const { data: entry, error: fetchError } = await supabase
      .from('guestbook_entries')
      .select('id, likes_count')
      .eq('id', id)
      .single();

    if (fetchError || !entry) {
      return jsonResponse(
        ErrorResponses.notFound('Guestbook entry not found'),
        404
      );
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('guestbook_likes')
      .select('id')
      .eq('entry_id', id)
      .eq('agent_id', agentId)
      .single();

    if (existingLike) {
      // Unlike - delete the like
      const { error: deleteError } = await supabase
        .from('guestbook_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Guestbook unlike error:', deleteError);
        return jsonResponse(
          ErrorResponses.databaseError('Failed to unlike entry'),
          500
        );
      }

      return jsonResponse(
        createSuccessResponse({
          entry_id: id,
          likes: Math.max(0, (entry.likes_count || 0) - 1),
          liked_by_you: false,
          message: 'Successfully unliked the entry',
        })
      );
    } else {
          // Like - create a new like
          const { error: insertError } = await supabase
            .from('guestbook_likes')
            .insert({
              entry_id: id,
              agent_id: agentId,
            });

      if (insertError) {
        // Check if it's a duplicate key error (already liked)
        if (insertError.code === '23505') {
          return jsonResponse(
            ErrorResponses.validationError('Already liked this entry'),
            409
          );
        }
        console.error('Guestbook like error:', insertError);
        return jsonResponse(
          ErrorResponses.databaseError('Failed to like entry'),
          500
        );
      }

      return jsonResponse(
        createSuccessResponse({
          entry_id: id,
          likes: (entry.likes_count || 0) + 1,
          liked_by_you: true,
          message: 'Successfully liked the entry',
        })
      );
    }
  } catch (error) {
    console.error('Guestbook like POST error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}

// Export POST with rate limiting and auth
export const POST = withRateLimit(
  'guestbook_like',
  withAuth(toggleLikeHandler)
);
