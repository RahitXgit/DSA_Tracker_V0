'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const { signIn, signUp } = useAuth()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isLogin) {
                await signIn(email, password)

                // Check if user has pending approval
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: approval } = await (supabase as any)
                        .from('user_approvals')
                        .select('status')
                        .eq('user_id', user.id)
                        .maybeSingle()

                    if (approval?.status === 'pending') {
                        router.push('/pending-approval')
                        toast.success('Your account is pending approval.')
                        return
                    }
                }

                router.push('/dashboard')
                toast.success('Logged in successfully!')
            } else {
                await signUp(email, username, password)
                router.push('/pending-approval')
                toast.success('Account created! Waiting for admin approval.')
            }
        } catch (error: any) {
            if (error.message === 'PENDING_APPROVAL') {
                router.push('/pending-approval')
                toast.success('Your account is pending approval.')
            } else {
                toast.error(error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glassmorphism p-10 w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="flex flex-col items-center justify-center gap-4 mb-4">
                        <span className="text-6xl">🎮</span>
                        <h1 className="text-3xl font-bold gradient-text text-center">
                            DSA Tracker
                        </h1>
                    </div>
                    <p className="text-foreground font-semibold text-center">Plan. Track. Master DSA.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div className="w-full">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full"
                            />
                        </div>
                    )}
                    <div className="w-full">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full"
                        />
                    </div>
                    <div className="w-full">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full"
                        />
                    </div>

                    {isLogin && (
                        <div className="text-right">
                            <a
                                href="/forgot-password"
                                className="text-sm text-primary hover:underline font-semibold transition-all"
                            >
                                Forgot Password?
                            </a>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn btn-primary"
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
                    </button>
                </form>

                <div className="text-center mt-8">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        disabled={loading}
                        className="text-secondary hover:gradient-text font-bold transition-all"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
                    </button>
                </div>
            </div>
        </div>
    )
}
