import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wlmffzgaowspgmftfuux.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWZmemdhb3dzcGdtZnRmdXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjIzMzYsImV4cCI6MjA4ODI5ODMzNn0.DGWaNIWE8m0h5rzkBlxEJsJxKKo6vExjc4xPONDA1tk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)