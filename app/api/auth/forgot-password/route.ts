import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

const RATE_LIMIT_MAX = 3 // Maximum requests per time window
const RATE_LIMIT_WINDOW_HOURS = 24 // Time window in hours

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400 }
            )
        }

        // Check rate limiting
        const windowStart = new Date()
        windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS)

        const { data: recentRequests, error: rateLimitError } = await supabaseAdmin
            .from('password_reset_requests')
            .select('id')
            .eq('email', email.toLowerCase())
            .gte('requested_at', windowStart.toISOString())

        if (rateLimitError) {
            console.error('Rate limit check error:', rateLimitError)
        }

        if (recentRequests && recentRequests.length >= RATE_LIMIT_MAX) {
            return NextResponse.json(
                {
                    error: `Too many password reset requests. Please try again in 24 hours. (${recentRequests.length}/${RATE_LIMIT_MAX} used)`
                },
                { status: 429 }
            )
        }

        // Log this request for rate limiting
        const { error: logError } = await supabaseAdmin
            .from('password_reset_requests')
            .insert({
                email: email.toLowerCase(),
                requested_at: new Date().toISOString(),
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
            })

        if (logError) {
            console.error('Failed to log reset request:', logError)
        }

        // Check if user exists (but don't reveal this to the client for security)
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, username')
            .eq('email', email.toLowerCase())
            .single()

        // Always return success to prevent email enumeration
        if (!user) {
            console.log('Password reset requested for non-existent email:', email)
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link shortly.'
            })
        }


        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

        // SECURITY: Invalidate all previous unused tokens for this user
        // This ensures only the latest reset link works
        const { error: invalidateError } = await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('user_id', user.id)
            .eq('used', false)

        if (invalidateError) {
            console.error('Failed to invalidate old tokens:', invalidateError)
            // Continue anyway - not critical
        } else {
            console.log('Invalidated previous unused tokens for user:', user.id)
        }

        // Store new token in database
        const { error: tokenError } = await supabaseAdmin
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                email: email.toLowerCase(),
                token: resetToken,
                expires_at: expiresAt.toISOString(),
                used: false
            })

        if (tokenError) {
            console.error('Failed to create reset token:', tokenError)
            return NextResponse.json(
                { error: 'Failed to process password reset request' },
                { status: 500 }
            )
        }


        // Send password reset email
        try {
            const { sendPasswordResetEmail } = await import('@/lib/email')
            await sendPasswordResetEmail(email, resetToken)
            console.log('Password reset email sent to:', email)
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError)
            // Don't fail the request if email fails, token is still valid
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link shortly.'
        })
    } catch (error: any) {
        console.error('Forgot password error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
