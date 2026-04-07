import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings.');
} else if (!supabaseUrl.startsWith('https://')) {
  console.error('Supabase URL 格式錯誤：必須以 https:// 開頭。請檢查您的 VITE_SUPABASE_URL 設定。');
}

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
