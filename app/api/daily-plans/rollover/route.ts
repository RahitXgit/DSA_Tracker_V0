import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST: Auto-rollover past incomplete tasks to today
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { today } = body

        if (!today) {
            return NextResponse.json({ error: 'Today date required' }, { status: 400 })
        }

        // Check for past incomplete tasks
        const { data: pastTasks, error: checkError } = await supabaseAdmin
            .from('daily_plans')
            .select('id')
            .eq('user_id', session.user.id)
            .lt('planned_date', today)
            .eq('status', 'PLANNED')

        if (checkError) {
            console.error('Check error:', checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (!pastTasks || pastTasks.length === 0) {
            return NextResponse.json({ rolled_over: 0 })
        }

        // Roll them over to today
        const { error: updateError } = await supabaseAdmin
            .from('daily_plans')
            .update({ planned_date: today })
            .eq('user_id', session.user.id)
            .lt('planned_date', today)
            .eq('status', 'PLANNED')

        if (updateError) {
            console.error('Update error:', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ rolled_over: pastTasks.length })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
