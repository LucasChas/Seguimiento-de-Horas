import { createClient } from '@supabase/supabase-js';
""
const VITE_SUPABASE_URL="https://mcrdacssebaldbevaybu.supabase.co"
const VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcmRhY3NzZWJhbGRiZXZheWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTgwMzQsImV4cCI6MjA2ODA3NDAzNH0.whiW8OtsHg_IPyhFsR0yeuC3qP4Aib29ENMI6J6toDw"
const supabaseUrl = VITE_SUPABASE_URL;
const supabaseAnonKey = VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

