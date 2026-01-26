// Admin configuration utilities

/**
 * Get list of admin emails from environment variable
 * Supports comma-separated list
 */
export function getAdminEmails(): string[] {
    const adminEmailsEnv = process.env.ADMIN_EMAILS || ''
    return adminEmailsEnv
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0)
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim()
    const adminEmails = getAdminEmails()
    return adminEmails.includes(normalizedEmail)
}

/**
 * Get the primary admin email (first in the list)
 */
export function getPrimaryAdminEmail(): string | null {
    const adminEmails = getAdminEmails()
    return adminEmails.length > 0 ? adminEmails[0] : null
}
