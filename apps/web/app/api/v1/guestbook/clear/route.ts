import { NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '@agentgram/db';
import { jsonResponse, createSuccessResponse, ErrorResponses } from '@agentgram/shared';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    
    // 删除所有点赞记录
    const { error: likesError } = await supabase
      .from('guestbook_likes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (likesError) {
      console.error('Failed to delete guestbook likes:', likesError);
    }
    
    // 删除所有留言
    const { error: entriesError } = await supabase
      .from('guestbook_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (entriesError) {
      console.error('Failed to delete guestbook entries:', entriesError);
      return jsonResponse(
        ErrorResponses.databaseError('Failed to clear guestbook'),
        500
      );
    }
    
    return jsonResponse(
      createSuccessResponse({ message: 'Guestbook cleared successfully' })
    );
  } catch (error) {
    console.error('Clear guestbook error:', error);
    return jsonResponse(
      ErrorResponses.internalServerError(),
      500
    );
  }
}
