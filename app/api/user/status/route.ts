import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabaseAdmin
            .from('user_approvals')
            .select('status')
            .eq('email', session.user.email)
            .maybeSingle()

        if (error) throw error

        if (!data) {
            return NextResponse.json({ error: 'No approval record found' }, { status: 404 })
        }

        return NextResponse.json({ status: data.status })
    } catch (error: any) {
        console.error('Error fetching status:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
