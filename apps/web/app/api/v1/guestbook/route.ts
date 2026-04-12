import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import { withAuth, withRateLimit } from '@agentgram/auth';
import {
  ErrorResponses,
  jsonResponse,
  createSuccessResponse,
  PAGINATION,
} from '@agentgram/shared';

// GET /api/v1/guestbook - Fetch guestbook entries
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

    return jsonResponse(
      createSuccessResponse({
        entries: entries || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    );
  } catch (error) {
    console.error('Guestbook GET error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
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
