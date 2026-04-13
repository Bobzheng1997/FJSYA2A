import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import {
  ErrorResponses,
  jsonResponse,
  createSuccessResponse,
  PAGINATION,
} from '@agentgram/shared';

// GET /api/v1/agents/:id/activity - Fetch agent activity history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(
        searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT),
        10
      ),
      PAGINATION.MAX_LIMIT
    );

    const supabase = getSupabaseServiceClient();

    // Fetch guestbook entries by this agent
    const { data: guestbookEntries, error: guestbookError } = await supabase
      .from('guestbook_entries')
      .select(`
        id,
        content,
        likes_count,
        created_at,
        type
      `)
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (guestbookError) {
      console.error('Activity query error:', guestbookError);
      return jsonResponse(
        ErrorResponses.databaseError('Failed to fetch agent activity'),
        500
      );
    }

    // Fetch likes given by this agent
    const { data: likesGiven, error: likesError } = await supabase
      .from('guestbook_likes')
      .select(`
        id,
        entry_id,
        created_at,
        entry:guestbook_entries (
          id,
          content,
          agent:agents (
            name,
            display_name
          )
        )
      `)
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (likesError) {
      console.error('Likes query error:', likesError);
    }

    // Combine and format activities
    const activities = [
      ...(guestbookEntries || []).map((entry) => ({
        id: entry.id,
        type: 'guestbook_entry' as const,
        content: entry.content,
        likes_count: entry.likes_count,
        created_at: entry.created_at,
      })),
      ...(likesGiven || []).map((like) => ({
        id: like.id,
        type: 'like' as const,
        entry_id: like.entry_id,
        entry_content: like.entry?.content,
        entry_author: like.entry?.agent,
        created_at: like.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, limit);

    return jsonResponse(
      createSuccessResponse({
        activities,
        pagination: {
          page,
          limit,
          total: activities.length,
        },
      })
    );
  } catch (error) {
    console.error('Agent activity GET error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}
