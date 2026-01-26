'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavbarProps {
    user: any
    signOut: () => void
    username?: string
}

export default function Navbar({ user, signOut, username }: NavbarProps) {
    const pathname = usePathname()

    const isActive = (path: string) => {
        return pathname === path
            ? 'gradient-primary text-white rounded-xl shadow-medium'
            : 'text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-all'
    }

    return (
        <nav className="glassmorphism sticky top-0 z-50 mb-6">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 gradient-primary rounded-xl shadow-soft"></div>
                            <h1 className="text-xl sm:text-2xl font-bold gradient-text">
                                DSA Tracker
                            </h1>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard"
                            className={`px-4 py-2 text-sm font-semibold transition-all ${isActive('/dashboard')}`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/dsa-patterns"
                            className={`px-4 py-2 text-sm font-semibold transition-all ${isActive('/dsa-patterns')}`}
                        >
                            DSA Patterns
                        </Link>
                        <Link
                            href="/history"
                            className={`px-4 py-2 text-sm font-semibold transition-all ${isActive('/history')}`}
                        >
                            History
                        </Link>
                        {user?.email === 'rahitdhara.main@gmail.com' && (
                            <Link
                                href="/admin"
                                className={`px-4 py-2 text-sm font-semibold transition-all ${isActive('/admin')}`}
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-muted rounded-xl shadow-soft">
                        <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold shadow-soft">
                            {(username || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-foreground font-semibold text-sm">
                            {username || user?.email?.split('@')[0]}
                        </span>
                    </div>
                    <button
                        onClick={signOut}
                        className="btn btn-secondary"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    )
}
