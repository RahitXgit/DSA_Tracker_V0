import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are not set. Using fallback client.')
}

// Singleton pattern to prevent multiple instances during hot reloading
const globalForSupabase = globalThis as unknown as {
    supabase: ReturnType<typeof createSupabaseClient> | undefined
}

// Create a mock client for build time
const createMockClient = () => ({
    from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signIn: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ error: null }),
    }
}) as any

// Only create client if we have valid credentials
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? (globalForSupabase.supabase ?? createSupabaseClient(supabaseUrl, supabaseAnonKey))
    : createMockClient()

if (process.env.NODE_ENV !== 'production' && supabase) {
    globalForSupabase.supabase = supabase
}

// Named export for client creation
export function createClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key must be provided')
    }
    return supabase
}
