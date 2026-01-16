'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Navbar from '@/components/Navbar'

interface DailyPlan {
    id: string
    problem_title: string
    topic: string
    platform: string
    difficulty: string
    status: 'PLANNED' | 'DONE' | 'SKIPPED'
    planned_date: string
    user_id: string
    completed_at?: string  // Optional timestamp for when task was completed
}

export default function Dashboard() {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const [plans, setPlans] = useState<DailyPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [newPlan, setNewPlan] = useState({
        problem_title: '',
        topic: '',
        platform: 'LeetCode',
        difficulty: 'Medium'
    })
    const [viewMode, setViewMode] = useState<'today' | 'tomorrow'>('today')
    const [username, setUsername] = useState<string>('')
    // Helper: Get Date in IST (Asia/Kolkata)
    const getISTDate = (offsetDays = 0) => {
        const now = new Date()
        // Get current time in IST as a parsable string
        const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
        const d = new Date(istString)
        d.setDate(d.getDate() + offsetDays)

        // Format manually to YYYY-MM-DD
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const [todayCount, setTodayCount] = useState(0)
    const [tomorrowCount, setTomorrowCount] = useState(0)

    // Fetch counts for both days independently
    const fetchCounts = async () => {
        if (!user) return
        const today = getISTDate(0)
        const tomorrow = getISTDate(1)

        // Count today
        const { count: countToday, error: errorToday } = await (supabase as any)
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('planned_date', today)

        // Count tomorrow
        const { count: countTomorrow, error: errorTomorrow } = await (supabase as any)
            .from('daily_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('planned_date', tomorrow)

        if (!errorToday) setTodayCount(countToday || 0)
        if (!errorTomorrow) setTomorrowCount(countTomorrow || 0)
    }

    // Fetch plans (today or tomorrow)
    const fetchPlans = async (mode: 'today' | 'tomorrow' = 'today') => {
        // Don't set viewMode here if we want to call this for refreshing current view
        // But the original code did setViewMode. 
        // Better pattern: use viewMode state for fetching appropriate data

        // If mode passed, update state, otherwise use current state (though arg is required in orig)
        // We will keep original signature but ensure we fetch proper data

        // Optimally, we just fetch plans for the requested mode

        setLoading(true)

        const date = mode === 'today'
            ? getISTDate(0)
            : getISTDate(1)

        console.log(`Fetching ${mode} plans for date:`, date)

        const { data, error } = await (supabase as any)
            .from('daily_plans')
            .select('*')
            .eq('user_id', user!.id)
            .eq('planned_date', date)

        if (error) {
            console.error('Fetch error:', error)
            toast.error(`Failed to fetch ${mode} plans: ${error.message}`)
        } else {
            console.log(`${mode} plans found:`, data)
            setPlans(data || [])
        }
        setLoading(false)
        fetchCounts() // Update counts whenever we fetch plans
    }

    // Auto-rollover past incomplete tasks
    const autoRollover = async () => {
        if (!user) return

        const today = getISTDate(0)

        // 1. Check if there are any past incomplete tasks
        const { data: pastTasks, error: checkError } = await (supabase as any)
            .from('daily_plans')
            .select('id')
            .eq('user_id', user.id)
            .lt('planned_date', today)
            .eq('status', 'PLANNED')

        if (checkError) {
            console.error('Error checking past tasks:', checkError)
            return
        }

        if (pastTasks && pastTasks.length > 0) {
            // 2. Roll them over
            const { error: updateError } = await (supabase as any)
                .from('daily_plans')
                .update({ planned_date: today })
                .eq('user_id', user.id)
                .lt('planned_date', today)
                .eq('status', 'PLANNED')

            if (updateError) {
                console.error('Error rolling over tasks:', updateError)
                toast.error('Failed to auto-rollover tasks')
            } else {
                toast.success(`🔄 Auto-moved ${pastTasks.length} pending tasks to Today!`, {
                    duration: 5000,
                    icon: '📅'
                })
            }
        }
    }

    // Initial load
    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        // Check approval status
        const checkApproval = async () => {
            // Admin can always access
            if (user.email === 'rahitdhara.main@gmail.com') {
                return;
            }

            try {
                const response = await fetch('/api/user/status')
                const data = await response.json()

                if (!response.ok) {
                    console.error('Approval check failed:', data.error)
                    // Don't toast here to avoid loops, just redirect if unsure
                    router.push('/pending-approval')
                    return
                }

                if (data.status !== 'approved') {
                    router.push('/pending-approval')
                }
            } catch (error) {
                console.error('Error checking status:', error)
                // Fail safe to pending
                router.push('/pending-approval')
            }
        };

        checkApproval();

        // Original dashboard initialization
        const initDashboard = async () => {
            await autoRollover();
            fetchPlans('today');
            fetchProfile();
            fetchCounts();
        };

        initDashboard();
    }, [user, router]);

    const fetchProfile = async () => {
        if (!user) return
        const { data, error } = await (supabase as any)
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single()

        if (!error && data) {
            setUsername((data as any).username)
        }
    }

    // Add new plan
    const addPlan = async (e: React.FormEvent) => {
        e.preventDefault()
        const today = getISTDate(0)

        const { error } = await (supabase as any)
            .from('daily_plans')
            .insert({
                user_id: user!.id,
                problem_title: newPlan.problem_title,
                topic: newPlan.topic,
                platform: newPlan.platform,
                difficulty: newPlan.difficulty,
                planned_date: today,
                status: 'PLANNED'
            })

        if (error) {
            toast.error(`Error: ${error.message}`)
        } else {
            toast.success('✅ Added to today!')
            setNewPlan({ problem_title: '', topic: '', platform: 'LeetCode', difficulty: 'Medium' })
            fetchPlans('today') // Refresh list
            fetchCounts() // Refresh counts
        }
    }

    // Mark complete
    const markComplete = async (id: string) => {
        const { error } = await (supabase as any)
            .from('daily_plans')
            .update({
                status: 'DONE',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            toast.error('Failed to mark complete')
        } else {
            toast.success('✅ Done!')
            fetchPlans(viewMode)
            fetchCounts()
        }
    }

    // Mark skip - ALSO moves to tomorrow IMMEDIATELY
    const markSkip = async (id: string) => {
        const tomorrow = getISTDate(1)

        const { error } = await (supabase as any)
            .from('daily_plans')
            .update({
                status: 'SKIPPED',
                planned_date: tomorrow  // ✅ MOVES TO TOMORROW IMMEDIATELY
            })
            .eq('id', id)

        if (error) {
            console.error('Skip error:', error)
            toast.error('Failed to skip')
        } else {
            toast.success('⏭️ Moved to tomorrow!')
            fetchPlans(viewMode)
            fetchCounts()
        }
    }



    if (!user) return null

    return (
        <div className="min-h-screen">
            <Navbar user={user} signOut={signOut} username={username} />

            <div className="max-w-6xl mx-auto p-6">
                {/* Planner Form */}
                <div className="glassmorphism p-8 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-5xl">📅</span>
                        <h2 className="text-2xl font-bold text-primary">TODAY'S PLAN</h2>
                    </div>

                    <form onSubmit={addPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <input
                            type="text"
                            placeholder="Problem title (ex: Two Sum)"
                            value={newPlan.problem_title}
                            onChange={(e) => setNewPlan({ ...newPlan, problem_title: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Topic (ex: Array, Two Pointers)"
                            value={newPlan.topic}
                            onChange={(e) => setNewPlan({ ...newPlan, topic: e.target.value })}
                            required
                        />
                        <select
                            value={newPlan.platform}
                            onChange={(e) => setNewPlan({ ...newPlan, platform: e.target.value })}
                        >
                            <option>LeetCode</option>
                            <option>GFG</option>
                            <option>Codeforces</option>
                            <option>TUF+</option>
                            <option>Others</option>
                        </select>
                        <select
                            value={newPlan.difficulty}
                            onChange={(e) => setNewPlan({ ...newPlan, difficulty: e.target.value })}
                        >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                        <button
                            type="submit"
                            className="md:col-span-2 btn btn-primary"
                        >
                            ➕ Add Question to Today
                        </button>
                    </form>



                    {/* Today/Tomorrow Tabs */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-muted p-4 border-4 border-black shadow-[6px_6px_0px_#000]">
                        <button
                            onClick={() => {
                                setViewMode('today')
                                fetchPlans('today')
                            }}
                            className={`flex-1 px-6 py-4 font-bold text-base transition-all border-4 border-black ${viewMode === 'today'
                                ? 'bg-primary text-primary-foreground shadow-[6px_6px_0px_#000] translate-x-[-2px] translate-y-[-2px]'
                                : 'bg-card text-muted-foreground shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]'
                                }`}
                        >
                            📅 TODAY ({todayCount})
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('tomorrow')
                                fetchPlans('tomorrow')
                            }}
                            className={`flex-1 px-6 py-4 font-bold text-base transition-all border-4 border-black ${viewMode === 'tomorrow'
                                ? 'bg-secondary text-secondary-foreground shadow-[6px_6px_0px_#000] translate-x-[-2px] translate-y-[-2px]'
                                : 'bg-card text-muted-foreground shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]'
                                }`}
                        >
                            ⏭️ TOMORROW ({tomorrowCount})
                        </button>
                    </div>

                    {/* Plans List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="pixel-spinner"></div>
                            <p className="font-bold text-primary animate-pulse">LOADING...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {plans.length === 0 ? (
                                <div className="text-center py-12 glassmorphism p-8">
                                    <div className="text-6xl mb-6">🎉</div>
                                    <p className="text-xl font-bold text-primary mb-4">
                                        {viewMode === 'today' ? 'NO QUESTIONS YET!' : 'ALL CLEAR!'}
                                    </p>
                                    <div className="inline-block px-6 py-3 bg-muted border-4 border-black shadow-[4px_4px_0px_#000]">
                                        <p className="text-foreground font-bold">
                                            {viewMode === 'today'
                                                ? '⬆️ ADD YOUR FIRST QUEST!'
                                                : '✨ GREAT JOB!'
                                            }
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                plans.map((plan) => (
                                    <div key={plan.id} className="pixel-card">
                                        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                                            <div className="flex-1 min-w-0 w-full">
                                                <h3 className="font-bold text-xl text-primary mb-4 leading-tight break-words">
                                                    {plan.problem_title.toUpperCase()}
                                                </h3>
                                                <div className="flex flex-wrap gap-3 mb-4">
                                                    <span className="pixel-badge bg-primary text-primary-foreground">
                                                        {plan.topic}
                                                    </span>
                                                    <span className="pixel-badge bg-muted text-foreground">
                                                        {plan.platform}
                                                    </span>
                                                    <span className={`pixel-badge ${plan.difficulty === 'Easy' ? 'bg-success text-black' : plan.difficulty === 'Medium' ? 'bg-warning text-black' : 'bg-danger text-white'}`}>
                                                        {plan.difficulty}
                                                    </span>
                                                    <span className="pixel-badge bg-card text-primary">
                                                        📅 {plan.planned_date}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full lg:w-auto">
                                                {plan.status === 'DONE' ? (
                                                    <div className="pixel-badge bg-success text-black text-center w-full sm:w-auto">
                                                        ✅ DONE
                                                    </div>
                                                ) : plan.status === 'SKIPPED' ? (
                                                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                                                        <div className="pixel-badge bg-warning text-black text-center">
                                                            ⏭️ SKIPPED
                                                        </div>
                                                        <button
                                                            onClick={() => markComplete(plan.id)}
                                                            className="btn bg-success text-black"
                                                        >
                                                            ✅ DONE
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => markComplete(plan.id)}
                                                            className="btn bg-success text-black"
                                                        >
                                                            ✅ DONE
                                                        </button>
                                                        <button
                                                            onClick={() => markSkip(plan.id)}
                                                            className="btn bg-warning text-black"
                                                        >
                                                            ⏭️ SKIP
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
