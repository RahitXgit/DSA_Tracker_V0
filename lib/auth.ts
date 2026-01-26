import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizeEmail } from "@/lib/validation"

const LOGIN_RATE_LIMIT = 5 // Maximum attempts
const LOGIN_WINDOW_MINUTES = 15 // Time window

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // Normalize email for consistent lookups
                const normalizedEmail = normalizeEmail(credentials.email)

                // Check rate limiting
                const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000)
                const { data: recentAttempts } = await supabaseAdmin
                    .from('login_attempts')
                    .select('id')
                    .eq('email', normalizedEmail)
                    .gte('attempted_at', windowStart.toISOString())

                if (recentAttempts && recentAttempts.length >= LOGIN_RATE_LIMIT) {
                    // Log the rate limit hit
                    await supabaseAdmin.from('login_attempts').insert({
                        email: normalizedEmail,
                        attempted_at: new Date().toISOString(),
                        success: false,
                        error_message: 'Rate limit exceeded',
                        ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                    })

                    throw new Error(`Too many login attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes.`)
                }

                try {
                    // Check user_approvals first
                    const { data: approval } = await supabaseAdmin
                        .from('user_approvals')
                        .select('status, user_id')
                        .eq('email', normalizedEmail)
                        .maybeSingle()

                    if (!approval) {
                        // Log failed attempt
                        await supabaseAdmin.from('login_attempts').insert({
                            email: normalizedEmail,
                            attempted_at: new Date().toISOString(),
                            success: false,
                            error_message: 'No account found',
                            ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                        })
                        throw new Error('No account found with this email')
                    }

                    if (approval.status === 'pending') {
                        await supabaseAdmin.from('login_attempts').insert({
                            email: normalizedEmail,
                            attempted_at: new Date().toISOString(),
                            success: false,
                            error_message: 'Pending approval',
                            ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                        })
                        throw new Error('PENDING_APPROVAL')
                    }

                    if (approval.status === 'rejected') {
                        await supabaseAdmin.from('login_attempts').insert({
                            email: normalizedEmail,
                            attempted_at: new Date().toISOString(),
                            success: false,
                            error_message: 'Account rejected',
                            ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                        })
                        throw new Error('Your account was rejected. Please contact the administrator.')
                    }

                    // Get user from users table
                    const { data: user } = await supabaseAdmin
                        .from('users')
                        .select('*')
                        .eq('email', normalizedEmail)
                        .maybeSingle()

                    if (!user) {
                        await supabaseAdmin.from('login_attempts').insert({
                            email: normalizedEmail,
                            attempted_at: new Date().toISOString(),
                            success: false,
                            error_message: 'Invalid credentials',
                            ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                        })
                        throw new Error('Invalid email or password')
                    }

                    // Verify password
                    const isValid = await bcrypt.compare(credentials.password, user.password)

                    if (!isValid) {
                        await supabaseAdmin.from('login_attempts').insert({
                            email: normalizedEmail,
                            attempted_at: new Date().toISOString(),
                            success: false,
                            error_message: 'Invalid password',
                            ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                        })
                        throw new Error('Invalid email or password')
                    }

                    // Log successful login
                    await supabaseAdmin.from('login_attempts').insert({
                        email: normalizedEmail,
                        attempted_at: new Date().toISOString(),
                        success: true,
                        ip_address: (req as any)?.headers?.['x-forwarded-for'] || 'unknown'
                    })

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.username
                    }
                } catch (error) {
                    // Re-throw the error to be handled by NextAuth
                    throw error
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.name = user.name
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.user.name = token.name as string
            }
            return session
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
}
