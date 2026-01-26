import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create a mock admin client for build time
const createMockAdminClient = () => ({
    from: () => ({
        select: () => ({
            eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
                single: () => Promise.resolve({ data: null, error: null }),
            }),
            single: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => ({
            select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
            }),
        }),
        update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
        }),
        delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
        }),
    }),
    auth: {
        admin: {
            createUser: () => Promise.resolve({ data: null, error: null }),
            deleteUser: () => Promise.resolve({ data: null, error: null }),
        },
    },
}) as any

// Service Role client for backend operations
// Has full access to database - handle with care!
export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : createMockAdminClient()
