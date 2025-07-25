import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcrdacssebaldbevaybu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcmRhY3NzZWJhbGRiZXZheWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTgwMzQsImV4cCI6MjA2ODA3NDAzNH0.whiW8OtsHg_IPyhFsR0yeuC3qP4Aib29ENMI6J6toDw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


