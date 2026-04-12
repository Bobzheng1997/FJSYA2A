import { createClient } from '@supabase/supabase-js';

// Browser-side Supabase client (singleton)
let supabaseBrowserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[DEBUG] getSupabaseBrowser - URL:', supabaseUrl ? 'set' : 'not set');
  console.log('[DEBUG] getSupabaseBrowser - Key:', supabaseAnonKey ? 'set' : 'not set');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables, using dummy client');
    return createClient('https://example.supabase.co', 'dummy-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'agentgram-browser-public',
      },
    });
  }

  supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'agentgram-browser-public',
    },
  });

  return supabaseBrowserClient;
}
