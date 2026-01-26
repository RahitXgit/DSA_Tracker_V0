import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: Fetch daily plans for a specific date
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const date = searchParams.get('date')

        if (!date) {
            return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('daily_plans')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('planned_date', date)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch plans error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST: Create a new daily plan
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { problem_title, topic, platform, difficulty, planned_date } = body

        // Validation
        if (!problem_title || !topic || !platform || !difficulty || !planned_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from('daily_plans')
            .insert({
                user_id: session.user.id,
                problem_title,
                topic,
                platform,
                difficulty,
                planned_date,
                status: 'PLANNED'
            })
            .select()
            .single()

        if (error) {
            console.error('Insert plan error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data }, { status: 201 })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH: Update a daily plan (mark complete, skip, etc.)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, status, planned_date, completed_at } = body

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        // Build update object
        const updates: any = {}
        if (status) updates.status = status
        if (planned_date) updates.planned_date = planned_date
        if (completed_at !== undefined) updates.completed_at = completed_at

        // Verify the plan belongs to the user before updating
        const { data: existing } = await supabaseAdmin
            .from('daily_plans')
            .select('user_id')
            .eq('id', id)
            .single()

        if (!existing || existing.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Plan not found or unauthorized' }, { status: 404 })
        }

        const { data, error } = await supabaseAdmin
            .from('daily_plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update plan error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
