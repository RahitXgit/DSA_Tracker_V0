'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavbarProps {
    user: any
    signOut: () => void
    username?: string
}

export default function Navbar({ user, signOut, username }: NavbarProps) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isActive = (path: string) => {
        return pathname === path
            ? 'gradient-primary text-white rounded-xl shadow-medium'
            : 'text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-all'
    }

    const closeMobileMenu = () => setMobileMenuOpen(false)

    return (
        <>
            <nav className="glassmorphism sticky top-0 z-50 mb-4 md:mb-6">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
                    {/* Mobile Layout */}
                    <div className="flex md:hidden items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <img src="/logo.png" alt="DSA Tracker" className="w-7 h-7" />
                            <h1 className="text-lg font-bold gradient-text">DSA Tracker</h1>
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Mobile User Avatar */}
                            <div className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold shadow-soft">
                                {(username || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                            </div>

                            {/* Hamburger Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="touch-target p-2 text-foreground hover:text-primary transition-colors"
                                aria-label="Toggle menu"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <div className="flex items-center gap-2">
                                    <img src="/logo.png" alt="DSA Tracker" className="w-8 h-8" />
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
                </div>
            </nav>

            {/* Mobile Menu Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="mobile-menu-backdrop md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Mobile Menu Drawer */}
            {mobileMenuOpen && (
                <div className="mobile-menu-drawer md:hidden">
                    <div className="p-6">
                        {/* User Info */}
                        <div className="flex items-center gap-3 pb-6 border-b border-border mb-6">
                            <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center text-white text-lg font-bold shadow-soft">
                                {(username || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-foreground font-bold text-base">
                                    {username || user?.email?.split('@')[0]}
                                </p>
                                <p className="text-muted-foreground text-sm">{user?.email}</p>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-2">
                            <Link
                                href="/dashboard"
                                onClick={closeMobileMenu}
                                className={`block px-4 py-3 text-base font-semibold transition-all ${isActive('/dashboard')}`}
                            >
                                📊 Dashboard
                            </Link>
                            <Link
                                href="/dsa-patterns"
                                onClick={closeMobileMenu}
                                className={`block px-4 py-3 text-base font-semibold transition-all ${isActive('/dsa-patterns')}`}
                            >
                                📚 DSA Patterns
                            </Link>
                            <Link
                                href="/history"
                                onClick={closeMobileMenu}
                                className={`block px-4 py-3 text-base font-semibold transition-all ${isActive('/history')}`}
                            >
                                📜 History
                            </Link>
                            {user?.email === 'rahitdhara.main@gmail.com' && (
                                <Link
                                    href="/admin"
                                    onClick={closeMobileMenu}
                                    className={`block px-4 py-3 text-base font-semibold transition-all ${isActive('/admin')}`}
                                >
                                    ⚙️ Admin
                                </Link>
                            )}
                        </nav>

                        {/* Logout Button */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <button
                                onClick={() => {
                                    closeMobileMenu()
                                    signOut()
                                }}
                                className="w-full btn btn-secondary"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
