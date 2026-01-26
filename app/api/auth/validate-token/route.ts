import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
    try {
        const { token } = await req.json()

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            )
        }

        // Find and validate token
        const { data: resetToken, error: tokenError } = await supabaseAdmin
            .from('password_reset_tokens')
            .select('*')
            .eq('token', token)
            .single()

        if (tokenError || !resetToken) {
            return NextResponse.json(
                { valid: false, error: 'Invalid or expired reset link' },
                { status: 200 }
            )
        }

        // Check if token is already used
        if (resetToken.used) {
            return NextResponse.json(
                { valid: false, error: 'This reset link has already been used. Please request a new one.' },
                { status: 200 }
            )
        }

        // Check if token is expired
        const now = new Date()
        const expiresAt = new Date(resetToken.expires_at)
        if (now > expiresAt) {
            return NextResponse.json(
                { valid: false, error: 'Reset link has expired. Please request a new one.' },
                { status: 200 }
            )
        }

        // Token is valid
        return NextResponse.json({
            valid: true,
            message: 'Token is valid'
        })
    } catch (error: any) {
        console.error('Validate token error:', error)
        return NextResponse.json(
            { valid: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
