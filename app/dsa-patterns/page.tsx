'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/contexts/AuthContext'

interface Problem {
    id: string
    title: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
    leetcode_url: string
    display_order: number
    is_premium: boolean
}

interface ProblemProgress {
    problem_id: string
    status: string
    last_solved_at: string | null
    revision_count: number
}

interface Pattern {
    id: string
    name: string
    description: string
    difficulty_level: string
    problem_count: number
    problems: Problem[]
}

interface Category {
    id: string
    name: string
    icon: string
    description: string
    problem_count: number
    display_order: number
    patterns: Pattern[]
}

export default function DSAPatternsPage() {
    const { user, signOut } = useAuth()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
    const [userProgress, setUserProgress] = useState<Map<string, ProblemProgress>>(new Map())
    const [updatingProblems, setUpdatingProblems] = useState<Set<string>>(new Set())

    const supabase = createClient()

    useEffect(() => {
        fetchAllData()
    }, [])

    async function fetchAllData() {
        try {
            setLoading(true)

            // Fetch categories
            const { data: categoriesData, error: catError } = await (supabase as any)
                .from('dsa_categories')
                .select('*')
                .order('display_order')

            if (catError) throw catError

            // Fetch patterns
            const { data: patternsData, error: patError } = await (supabase as any)
                .from('dsa_patterns')
                .select('*')
                .order('display_order')

            if (patError) throw patError

            // Fetch problems
            const { data: problemsData, error: probError } = await (supabase as any)
                .from('dsa_problems')
                .select('*')
                .order('display_order')

            if (probError) throw probError

            // Organize data hierarchically
            const organizedCategories = categoriesData.map((cat: any) => ({
                ...cat,
                patterns: patternsData
                    .filter((pat: any) => pat.category_id === cat.id)
                    .map((pat: any) => ({
                        ...pat,
                        problems: problemsData.filter((prob: any) => prob.pattern_id === pat.id)
                    }))
            }))

            setCategories(organizedCategories)

            // Fetch user progress if logged in
            if (user) {
                await fetchUserProgress()
            }
        } catch (error: any) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load DSA patterns')
        } finally {
            setLoading(false)
        }
    }

    async function fetchUserProgress() {
        if (!user) return

        try {
            const { data, error } = await (supabase as any)
                .from('user_problem_progress')
                .select('problem_id, status, last_solved_at, revision_count')
                .eq('user_id', user.id)

            if (error) throw error

            const progressMap = new Map<string, ProblemProgress>()
            data?.forEach((item: any) => {
                progressMap.set(item.problem_id, item)
            })
            setUserProgress(progressMap)
        } catch (error: any) {
            console.error('Error fetching user progress:', error)
        }
    }

    function toggleCategory(categoryId: string) {
        const newExpanded = new Set(expandedCategories)
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId)
        } else {
            newExpanded.add(categoryId)
        }
        setExpandedCategories(newExpanded)
    }

    function togglePattern(patternId: string) {
        const newExpanded = new Set(expandedPatterns)
        if (newExpanded.has(patternId)) {
            newExpanded.delete(patternId)
        } else {
            newExpanded.add(patternId)
        }
        setExpandedPatterns(newExpanded)
    }

    async function toggleProblemStatus(problemId: string) {
        if (!user) {
            toast.error('Please login to track your progress')
            return
        }

        // Prevent double-clicks
        if (updatingProblems.has(problemId)) return

        setUpdatingProblems(prev => new Set(prev).add(problemId))

        try {
            const currentProgress = userProgress.get(problemId)
            const isSolved = currentProgress?.status === 'solved'

            if (isSolved) {
                // Mark as not solved - delete the record
                const { error } = await (supabase as any)
                    .from('user_problem_progress')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('problem_id', problemId)

                if (error) throw error

                // Update local state
                const newProgress = new Map(userProgress)
                newProgress.delete(problemId)
                setUserProgress(newProgress)
                toast.success('Problem unmarked')
            } else {
                // Mark as solved
                const now = new Date().toISOString()

                if (currentProgress) {
                    // Update existing record
                    const { error } = await (supabase as any)
                        .from('user_problem_progress')
                        .update({
                            status: 'solved',
                            last_solved_at: now,
                            revision_count: (currentProgress.revision_count || 0) + 1
                        })
                        .eq('user_id', user.id)
                        .eq('problem_id', problemId)

                    if (error) throw error

                    // Update local state
                    const newProgress = new Map(userProgress)
                    newProgress.set(problemId, {
                        ...currentProgress,
                        status: 'solved',
                        last_solved_at: now,
                        revision_count: (currentProgress.revision_count || 0) + 1
                    })
                    setUserProgress(newProgress)
                } else {
                    // Insert new record
                    const { error } = await (supabase as any)
                        .from('user_problem_progress')
                        .insert({
                            user_id: user.id,
                            problem_id: problemId,
                            status: 'solved',
                            first_solved_at: now,
                            last_solved_at: now,
                            revision_count: 1
                        })

                    if (error) throw error

                    // Update local state
                    const newProgress = new Map(userProgress)
                    newProgress.set(problemId, {
                        problem_id: problemId,
                        status: 'solved',
                        last_solved_at: now,
                        revision_count: 1
                    })
                    setUserProgress(newProgress)
                }
                toast.success('Problem marked as solved!')
            }
        } catch (error: any) {
            console.error('Error updating problem status:', error)
            toast.error('Failed to update problem status')
        } finally {
            setUpdatingProblems(prev => {
                const newSet = new Set(prev)
                newSet.delete(problemId)
                return newSet
            })
        }
    }

    function getDifficultyColor(difficulty: string) {
        switch (difficulty) {
            case 'Easy':
                return 'badge badge-easy'
            case 'Medium':
                return 'badge badge-medium'
            case 'Hard':
                return 'badge badge-hard'
            default:
                return 'badge'
        }
    }

    // Filter problems based on search and difficulty
    const filteredCategories = categories.map(cat => ({
        ...cat,
        patterns: cat.patterns.map(pat => ({
            ...pat,
            problems: pat.problems.filter(prob => {
                const matchesSearch = searchQuery === '' ||
                    prob.title.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesDifficulty = difficultyFilter === 'all' ||
                    prob.difficulty === difficultyFilter
                return matchesSearch && matchesDifficulty
            })
        })).filter(pat => pat.problems.length > 0)
    })).filter(cat => cat.patterns.length > 0)

    const totalProblems = categories.reduce((sum, cat) =>
        sum + cat.patterns.reduce((pSum, pat) => pSum + pat.problems.length, 0), 0
    )

    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <Navbar user={user} signOut={signOut} />

            <div className="max-w-7xl mx-auto p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="spinner"></div>
                        <p className="mt-4 font-semibold text-primary">Loading DSA Patterns...</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="glassmorphism p-8 mb-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold gradient-text">DSA Patterns</h1>
                                    <p className="text-muted-foreground mt-2">
                                        Master {totalProblems} problems across {categories.length} categories and{' '}
                                        {categories.reduce((sum, cat) => sum + cat.patterns.length, 0)} patterns
                                    </p>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="🔍 Search problems..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
                                        <button
                                            key={diff}
                                            onClick={() => setDifficultyFilter(diff)}
                                            className={`px-4 py-3 rounded-xl font-bold transition-all ${difficultyFilter === diff
                                                ? 'gradient-primary text-white shadow-medium'
                                                : 'bg-muted hover:shadow-soft hover:scale-[1.02]'
                                                }`}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Categories List */}
                        <div className="space-y-6">
                            {filteredCategories.map((category) => (
                                <div key={category.id} className="card hover-lift">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(category.id)}
                                        className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-soft">
                                                {category.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <h2 className="text-2xl font-bold">{category.name}</h2>
                                                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="badge badge-primary">
                                                        {category.patterns.length} Patterns
                                                    </span>
                                                    <span className="badge" style={{ background: 'rgba(44, 62, 80, 0.1)', color: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
                                                        {category.problem_count} Problems
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-2xl text-muted-foreground">
                                            {expandedCategories.has(category.id) ? '▼' : '▶'}
                                        </div>
                                    </button>

                                    {/* Patterns List */}
                                    {expandedCategories.has(category.id) && (
                                        <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                                            {category.patterns.map((pattern) => (
                                                <div
                                                    key={pattern.id}
                                                    className="card"
                                                >
                                                    {/* Pattern Header */}
                                                    <button
                                                        onClick={() => togglePattern(pattern.id)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                                                    >
                                                        <div className="text-left flex-1">
                                                            <h3 className="text-lg font-bold text-foreground">{pattern.name}</h3>
                                                            {pattern.description && (
                                                                <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                                                            )}
                                                            <div className="flex gap-2 mt-2">
                                                                {pattern.difficulty_level && (
                                                                    <span className="badge" style={{ background: 'rgba(255, 184, 77, 0.1)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                                                                        {pattern.difficulty_level}
                                                                    </span>
                                                                )}
                                                                <span className="badge badge-primary">
                                                                    {pattern.problems.length} Problems
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xl ml-4 text-muted-foreground">
                                                            {expandedPatterns.has(pattern.id) ? '▼' : '▶'}
                                                        </div>
                                                    </button>

                                                    {/* Problems List */}
                                                    {expandedPatterns.has(pattern.id) && (
                                                        <div className="border-t border-border p-4 space-y-3 bg-muted/10">
                                                            {pattern.problems.map((problem, idx) => {
                                                                const progress = userProgress.get(problem.id)
                                                                const isSolved = progress?.status === 'solved'
                                                                const isUpdating = updatingProblems.has(problem.id)

                                                                return (
                                                                    <div
                                                                        key={problem.id}
                                                                        className="card hover-lift"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div className="flex items-start gap-3 flex-1">
                                                                                {/* Checkbox */}
                                                                                <button
                                                                                    onClick={() => toggleProblemStatus(problem.id)}
                                                                                    disabled={isUpdating}
                                                                                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSolved
                                                                                        ? 'bg-success border-success'
                                                                                        : 'border-border hover:border-primary'
                                                                                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                                >
                                                                                    {isSolved && (
                                                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                        </svg>
                                                                                    )}
                                                                                </button>

                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                                                            {idx + 1}
                                                                                        </span>
                                                                                        <h4 className={`font-semibold ${isSolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                                                            {problem.title}
                                                                                        </h4>
                                                                                    </div>

                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        {problem.is_premium && (
                                                                                            <span className="text-xs text-warning font-semibold">★ Premium</span>
                                                                                        )}
                                                                                        {isSolved && progress?.last_solved_at && (
                                                                                            <span className="text-xs text-success font-medium">
                                                                                                ✓ Solved on {new Date(progress.last_solved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                                                {progress.revision_count > 1 && ` (${progress.revision_count}x)`}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-3">
                                                                                <span className={getDifficultyColor(problem.difficulty)}>
                                                                                    {problem.difficulty}
                                                                                </span>
                                                                                {problem.leetcode_url && (
                                                                                    <a
                                                                                        href={problem.leetcode_url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="btn btn-primary text-sm px-4 py-2"
                                                                                    >
                                                                                        Solve →
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Empty State */}
                        {filteredCategories.length === 0 && (
                            <div className="glassmorphism p-12 text-center">
                                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold mb-2">No Problems Found</h3>
                                <p className="text-muted-foreground">
                                    Try adjusting your search or filters
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
