'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(true)
    const [tokenError, setTokenError] = useState('')

    useEffect(() => {
        const tokenParam = searchParams.get('token')
        if (!tokenParam) {
            setTokenError('Invalid reset link')
            setValidating(false)
            return
        }

        setToken(tokenParam)

        // Validate token on page load
        const validateToken = async () => {
            try {
                const response = await fetch('/api/auth/validate-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tokenParam })
                })

                const data = await response.json()

                if (!data.valid) {
                    setTokenError(data.error || 'Invalid reset link')
                } else {
                    setTokenError('')
                }
            } catch (error) {
                console.error('Token validation error:', error)
                setTokenError('Failed to validate reset link')
            } finally {
                setValidating(false)
            }
        }

        validateToken()
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to reset password')
                return
            }

            toast.success('Password reset successfully!')
            setTimeout(() => {
                router.push('/login')
            }, 1500)
        } catch (error: any) {
            console.error('Reset password error:', error)
            toast.error('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Show loading while validating token
    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
                <div className="card max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Validating reset link...</p>
                </div>
            </div>
        )
    }

    if (!token || tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
                <div className="card max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-danger rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
                    <p className="text-muted-foreground mb-6">
                        {tokenError || 'This password reset link is invalid or has expired.'}
                    </p>
                    <Link href="/forgot-password" className="btn btn-primary">
                        Request New Reset Link
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
            <div className="card max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
                    <p className="text-muted-foreground">
                        Enter your new password below
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold mb-2">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            minLength={6}
                            disabled={loading}
                            className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Must be at least 6 characters long
                        </p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            minLength={6}
                            disabled={loading}
                            className="w-full"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/login" className="text-sm text-primary hover:underline">
                        ← Back to Login
                    </Link>
                </div>

                <div className="info-box mt-6">
                    <p className="text-xs text-muted-foreground">
                        <strong>🔒 Security:</strong> This reset link expires in 1 hour and can only be used once.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
