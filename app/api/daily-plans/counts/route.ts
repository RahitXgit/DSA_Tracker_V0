import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: Get counts for today and tomorrow
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const todayDate = searchParams.get('today')
        const tomorrowDate = searchParams.get('tomorrow')

        if (!todayDate || !tomorrowDate) {
            return NextResponse.json(
                { error: 'Both today and tomorrow dates required' },
                { status: 400 }
            )
        }

        // Count today
        const { count: todayCount, error: todayError } = await supabaseAdmin
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('planned_date', todayDate)

        // Count tomorrow
        const { count: tomorrowCount, error: tomorrowError } = await supabaseAdmin
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('planned_date', tomorrowDate)

        if (todayError || tomorrowError) {
            console.error('Count error:', todayError || tomorrowError)
            return NextResponse.json(
                { error: 'Failed to fetch counts' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            today: todayCount || 0,
            tomorrow: tomorrowCount || 0
        })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
