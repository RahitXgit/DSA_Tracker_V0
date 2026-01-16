import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { supabaseAdmin } from "@/lib/supabase-admin"

const ADMIN_EMAIL = 'rahitdhara.main@gmail.com'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        // Protection: Ensure user is logged in
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Protection: Ensure user is admin
        if (session.user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data, error } = await supabaseAdmin
            .from('user_approvals')
            .select('*')
            .order('requested_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching approvals:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id, status } = await req.json()

        if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
        }

        // Update approval status
        const { data: updatedApproval, error: updateError } = await supabaseAdmin
            .from('user_approvals')
            .update({
                status,
                reviewed_by: session.user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('email, user_id')
            .single()

        if (updateError) throw updateError

        // Send approval email if status is approved (non-blocking)
        if (status === 'approved' && updatedApproval) {
            try {
                // Get username from users table
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('username')
                    .eq('id', updatedApproval.user_id)
                    .single()

                if (userData) {
                    const { sendApprovalEmail } = await import('@/lib/email')
                    await sendApprovalEmail(updatedApproval.email, userData.username)
                    console.log('Approval email sent to:', updatedApproval.email)
                }
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError)
                // Don't fail the approval if email fails
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating approval:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
