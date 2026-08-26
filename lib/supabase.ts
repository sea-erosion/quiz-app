import { createClient } from '@supabase/supabase-js';

// .env.local に書いた値をここで読み込む
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// アプリ全体でこの1つのクライアントを使い回す
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
