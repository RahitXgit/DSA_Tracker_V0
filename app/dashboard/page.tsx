'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

        try {
            const response = await fetch(`/api/daily-plans/counts?today=${today}&tomorrow=${tomorrow}`)
            const data = await response.json()

            if (response.ok) {
                setTodayCount(data.today || 0)
                setTomorrowCount(data.tomorrow || 0)
            } else {
                console.error('Failed to fetch counts:', data.error)
            }
        } catch (error) {
            console.error('Error fetching counts:', error)
        }
    }

    // Fetch plans (today or tomorrow)
    const fetchPlans = async (mode: 'today' | 'tomorrow' = 'today') => {
        setLoading(true)

        const date = mode === 'today'
            ? getISTDate(0)
            : getISTDate(1)

        console.log(`Fetching ${mode} plans for date:`, date)

        try {
            const response = await fetch(`/api/daily-plans?date=${date}`)
            const result = await response.json()

            if (response.ok) {
                console.log(`${mode} plans found:`, result.data)
                setPlans(result.data || [])
            } else {
                console.error('Fetch error:', result.error)
                toast.error(`Failed to fetch ${mode} plans: ${result.error}`)
            }
        } catch (error) {
            console.error('Network error:', error)
            toast.error(`Network error fetching ${mode} plans`)
        }

        setLoading(false)
        fetchCounts() // Update counts whenever we fetch plans
    }

    // Auto-rollover past incomplete tasks
    const autoRollover = async () => {
        if (!user) return

        const today = getISTDate(0)

        try {
            const response = await fetch('/api/daily-plans/rollover', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ today })
            })

            const data = await response.json()

            if (response.ok && data.rolled_over > 0) {
                toast.success(`🔄 Auto-moved ${data.rolled_over} pending tasks to Today!`, {
                    duration: 5000,
                    icon: '📅'
                })
            } else if (!response.ok) {
                console.error('Rollover error:', data.error)
            }
        } catch (error) {
            console.error('Error rolling over tasks:', error)
            toast.error('Failed to auto-rollover tasks')
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

        try {
            const response = await fetch('/api/user/profile')
            const data = await response.json()

            if (response.ok && data.username) {
                setUsername(data.username)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    // Add new plan
    const addPlan = async (e: React.FormEvent) => {
        e.preventDefault()
        const today = getISTDate(0)

        try {
            const response = await fetch('/api/daily-plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problem_title: newPlan.problem_title,
                    topic: newPlan.topic,
                    platform: newPlan.platform,
                    difficulty: newPlan.difficulty,
                    planned_date: today
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast.success('✅ Added to today!')
                setNewPlan({ problem_title: '', topic: '', platform: 'LeetCode', difficulty: 'Medium' })
                fetchPlans('today') // Refresh list
                fetchCounts() // Refresh counts
            } else {
                toast.error(`Error: ${result.error}`)
            }
        } catch (error) {
            console.error('Network error:', error)
            toast.error('Failed to add plan')
        }
    }

    // Mark complete
    const markComplete = async (id: string) => {
        try {
            const response = await fetch('/api/daily-plans', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    status: 'DONE',
                    completed_at: new Date().toISOString()
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast.success('✅ Done!')
                fetchPlans(viewMode)
                fetchCounts()
            } else {
                toast.error(`Failed to mark complete: ${result.error}`)
            }
        } catch (error) {
            console.error('Network error:', error)
            toast.error('Failed to mark complete')
        }
    }

    // Mark skip - ALSO moves to tomorrow IMMEDIATELY
    const markSkip = async (id: string) => {
        const tomorrow = getISTDate(1)

        try {
            const response = await fetch('/api/daily-plans', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    status: 'SKIPPED',
                    planned_date: tomorrow  // ✅ MOVES TO TOMORROW IMMEDIATELY
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast.success('⏭️ Moved to tomorrow!')
                fetchPlans(viewMode)
                fetchCounts()
            } else {
                console.error('Skip error:', result.error)
                toast.error('Failed to skip')
            }
        } catch (error) {
            console.error('Network error:', error)
            toast.error('Failed to skip')
        }
    }



    if (!user) return null

    return (
        <div className="min-h-screen">
            <Navbar user={user} signOut={signOut} username={username} />

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
                {/* Planner Form */}
                <div className="glassmorphism p-4 md:p-8 mb-6 md:mb-8">
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <span className="text-4xl md:text-5xl">📅</span>
                        <h2 className="text-xl md:text-2xl font-bold gradient-text">Today's Plan</h2>
                    </div>

                    <form onSubmit={addPlan} className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 mb-6 md:mb-8">
                        <input
                            type="text"
                            placeholder="Problem title (ex: Two Sum)"
                            value={newPlan.problem_title}
                            onChange={(e) => setNewPlan({ ...newPlan, problem_title: e.target.value })}
                            required
                            className="w-full"
                        />
                        <input
                            type="text"
                            placeholder="Topic (ex: Array, Two Pointers)"
                            value={newPlan.topic}
                            onChange={(e) => setNewPlan({ ...newPlan, topic: e.target.value })}
                            required
                            className="w-full"
                        />
                        <select
                            value={newPlan.platform}
                            onChange={(e) => setNewPlan({ ...newPlan, platform: e.target.value })}
                            className="w-full"
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
                            className="w-full"
                        >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                        <button
                            type="submit"
                            className="w-full md:col-span-2 btn btn-primary"
                        >
                            ➕ Add Question to Today
                        </button>
                    </form>



                    {/* Today/Tomorrow Tabs */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
                        <button
                            onClick={() => {
                                setViewMode('today')
                                fetchPlans('today')
                            }}
                            className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-bold text-sm md:text-base transition-all rounded-xl ${viewMode === 'today'
                                    ? 'gradient-primary text-white shadow-large'
                                    : 'bg-card text-muted-foreground shadow-soft hover:shadow-medium active:scale-[0.98]'
                                }`}
                        >
                            📅 TODAY ({todayCount})
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('tomorrow')
                                fetchPlans('tomorrow')
                            }}
                            className={`flex-1 px-4 md:px-6 py-3 md:py-4 font-bold text-sm md:text-base transition-all rounded-xl ${viewMode === 'tomorrow'
                                    ? 'gradient-secondary text-white shadow-large'
                                    : 'bg-card text-muted-foreground shadow-soft hover:shadow-medium active:scale-[0.98]'
                                }`}
                        >
                            ⏭️ TOMORROW ({tomorrowCount})
                        </button>
                    </div>

                    {/* Plans List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="spinner"></div>
                            <p className="font-bold gradient-text">Loading...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {plans.length === 0 ? (
                                <div className="text-center py-12 card">
                                    <div className="text-6xl mb-6">🎉</div>
                                    <p className="text-xl font-bold gradient-text mb-4">
                                        {viewMode === 'today' ? 'NO QUESTIONS YET!' : 'ALL CLEAR!'}
                                    </p>
                                    <div className="inline-block px-6 py-3 bg-muted rounded-xl shadow-soft">
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
                                    <div key={plan.id} className="card hover-lift">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex-1 min-w-0 w-full">
                                                <h3 className="font-bold text-lg md:text-xl gradient-text mb-3 md:mb-4 leading-tight break-words">
                                                    {plan.problem_title}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 md:gap-3 mb-3 md:mb-4">
                                                    <span className="badge badge-primary text-xs md:text-sm">
                                                        {plan.topic}
                                                    </span>
                                                    <span className="badge bg-muted text-foreground text-xs md:text-sm">
                                                        {plan.platform}
                                                    </span>
                                                    <span className={`badge text-xs md:text-sm ${plan.difficulty === 'Easy' ? 'badge-easy' : plan.difficulty === 'Medium' ? 'badge-medium' : 'badge-hard'}`}>
                                                        {plan.difficulty}
                                                    </span>
                                                    <span className="badge bg-card text-primary shadow-soft text-xs md:text-sm">
                                                        📅 {plan.planned_date}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 w-full">
                                                {plan.status === 'DONE' ? (
                                                    <div className="badge badge-easy text-center w-full px-4 md:px-6 py-2 md:py-3 text-sm md:text-base">
                                                        ✅ DONE
                                                    </div>
                                                ) : plan.status === 'SKIPPED' ? (
                                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 items-stretch w-full">
                                                        <div className="badge badge-medium text-center px-4 md:px-6 py-2 md:py-3 text-sm md:text-base">
                                                            ⏭️ SKIPPED
                                                        </div>
                                                        <button
                                                            onClick={() => markComplete(plan.id)}
                                                            className="flex-1 btn btn-success text-sm md:text-base"
                                                        >
                                                            ✅ DONE
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full">
                                                        <button
                                                            onClick={() => markComplete(plan.id)}
                                                            className="flex-1 btn btn-success text-sm md:text-base"
                                                        >
                                                            ✅ DONE
                                                        </button>
                                                        <button
                                                            onClick={() => markSkip(plan.id)}
                                                            className="flex-1 btn btn-warning text-sm md:text-base"
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
