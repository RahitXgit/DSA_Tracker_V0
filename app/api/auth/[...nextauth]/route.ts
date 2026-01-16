import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase-admin"

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // Check user_approvals first
                const { data: approval } = await supabaseAdmin
                    .from('user_approvals')
                    .select('status, user_id')
                    .eq('email', credentials.email)
                    .maybeSingle()

                if (!approval) {
                    throw new Error('No account found with this email')
                }

                if (approval.status === 'pending') {
                    throw new Error('PENDING_APPROVAL')
                }

                if (approval.status === 'rejected') {
                    throw new Error('Your account was rejected. Please contact the administrator.')
                }

                // Get user from users table
                const { data: user } = await supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('email', credentials.email)
                    .maybeSingle()

                if (!user) {
                    throw new Error('Invalid email or password')
                }

                // Verify password
                const isValid = await bcrypt.compare(credentials.password, user.password)

                if (!isValid) {
                    throw new Error('Invalid email or password')
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.username
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
})

export { handler as GET, handler as POST }
