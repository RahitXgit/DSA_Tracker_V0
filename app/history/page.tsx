'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

interface DailyPlan {
    id: string
    problem_title: string
    topic: string
    platform: string
    difficulty: string
    status: 'PLANNED' | 'DONE' | 'SKIPPED'
    planned_date: string
    completed_at: string
    created_at: string
    user_id: string
}

interface GroupedPlans {
    [date: string]: DailyPlan[]
}

export default function History() {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const [history, setHistory] = useState<GroupedPlans>({})
    const [loading, setLoading] = useState(true)
    const [username, setUsername] = useState<string>('')

    useEffect(() => {
        if (!user) {
            router.push('/login')
            return
        }
        fetchHistory()
        fetchProfile()
    }, [user, router])

    const fetchProfile = async () => {
        if (!user) return
        const { data, error } = await (supabase as any)
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single()

        if (!error && data) {
            setUsername(data.username)
        }
    }

    const fetchHistory = async () => {
        setLoading(true)
        const { data, error } = await (supabase as any)
            .from('daily_plans')
            .select('*')
            .eq('user_id', user!.id)
            .eq('status', 'DONE')
            .order('completed_at', { ascending: false })

        if (error) {
            console.error('Error fetching history:', error)
        } else {
            // Group by date
            const grouped = (data || []).reduce((acc: GroupedPlans, plan: DailyPlan) => {
                // Use completed_at date if available, otherwise planned_date
                const dateKey = plan.completed_at
                    ? new Date(plan.completed_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                    : new Date(plan.planned_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })

                if (!acc[dateKey]) {
                    acc[dateKey] = []
                }
                acc[dateKey].push(plan)
                return acc
            }, {})
            setHistory(grouped)
        }
        setLoading(false)
    }

    if (!user) return null

    return (
        <div className="min-h-screen">
            <Navbar user={user} signOut={signOut} username={username} />

            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gradient">📜 History</h1>
                    <p className="text-muted-foreground mt-2">Your journey of completed problems.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                    </div>
                ) : Object.keys(history).length === 0 ? (
                    <div className="text-center py-12 glassmorphism rounded-3xl">
                        <div className="text-6xl mb-4">🕸️</div>
                        <p className="text-xl font-semibold text-primary">No history yet!</p>
                        <p className="text-muted-foreground">Go to Dashboard and complete some problems.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(history).map(([date, plans]) => (
                            <div key={date} className="glassmorphism rounded-3xl overflow-hidden">
                                <div className="bg-muted px-8 py-4">
                                    <h2 className="text-lg font-bold text-primary">{date}</h2>
                                    <p className="text-sm text-muted-foreground">{plans.length} problem{plans.length !== 1 ? 's' : ''} solved</p>
                                </div>
                                <div className="divide-y divide-border">
                                    {plans.map((plan) => (
                                        <div key={plan.id} className="p-6">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg mb-2">{plan.problem_title}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                                                            {plan.topic}
                                                        </span>
                                                        <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm font-medium">
                                                            {plan.platform}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${plan.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300' :
                                                            plan.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                                                'bg-red-500/20 text-red-300'
                                                            }`}>
                                                            {plan.difficulty}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-bold">
                                                        ✅ DONE
                                                    </span>
                                                    <div className="flex flex-col gap-1 mt-2">
                                                        {plan.created_at && (
                                                            <p className="text-xs text-muted-foreground" title={new Date(plan.created_at).toLocaleString()}>
                                                                Created: {new Date(plan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                        {plan.completed_at && (
                                                            <p className="text-xs text-green-300 font-medium" title={new Date(plan.completed_at).toLocaleString()}>
                                                                Completed: {new Date(plan.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
