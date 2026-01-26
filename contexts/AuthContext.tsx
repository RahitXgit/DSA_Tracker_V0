'use client'
import { createContext, useContext } from 'react'
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

type AuthContextType = {
    user: any | null
    session: any | null
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, username: string, password: string) => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()

    const signIn = async (email: string, password: string) => {
        const result = await nextAuthSignIn('credentials', {
            email,
            password,
            redirect: false
        })

        if (result?.error) {
            if (result.error === 'PENDING_APPROVAL') {
                throw new Error('PENDING_APPROVAL')
            }
            throw new Error(result.error)
        }

        if (!result?.ok) {
            throw new Error('Invalid email or password')
        }
    }

    const signUp = async (email: string, username: string, password: string) => {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create account')
        }
    }

    const signOut = async () => {
        await nextAuthSignOut({ redirect: true })
        window.location.href = '/login'
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{
            user: session?.user ?? null,
            session,
            signIn,
            signUp,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
