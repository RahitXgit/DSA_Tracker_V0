// Input validation utilities for authentication

export interface ValidationError {
    field: string
    message: string
}

export function validateEmail(email: string): ValidationError | null {
    if (!email || typeof email !== 'string') {
        return { field: 'email', message: 'Email is required' }
    }

    const trimmedEmail = email.trim()

    if (trimmedEmail.length === 0) {
        return { field: 'email', message: 'Email is required' }
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
        return { field: 'email', message: 'Invalid email format' }
    }

    if (trimmedEmail.length > 254) {
        return { field: 'email', message: 'Email is too long' }
    }

    return null
}

export function validateUsername(username: string): ValidationError | null {
    if (!username || typeof username !== 'string') {
        return { field: 'username', message: 'Username is required' }
    }

    const trimmedUsername = username.trim()

    if (trimmedUsername.length < 3) {
        return { field: 'username', message: 'Username must be at least 3 characters' }
    }

    if (trimmedUsername.length > 30) {
        return { field: 'username', message: 'Username must be at most 30 characters' }
    }

    // Only allow alphanumeric, hyphens, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
        return { field: 'username', message: 'Username can only contain letters, numbers, hyphens, and underscores' }
    }

    // Don't allow only numbers
    if (/^\d+$/.test(trimmedUsername)) {
        return { field: 'username', message: 'Username cannot be only numbers' }
    }

    return null
}

export function validatePassword(password: string): ValidationError | null {
    if (!password || typeof password !== 'string') {
        return { field: 'password', message: 'Password is required' }
    }

    if (password.length < 8) {
        return { field: 'password', message: 'Password must be at least 8 characters' }
    }

    if (password.length > 128) {
        return { field: 'password', message: 'Password is too long' }
    }

    if (!/[A-Z]/.test(password)) {
        return { field: 'password', message: 'Password must contain at least one uppercase letter' }
    }

    if (!/[a-z]/.test(password)) {
        return { field: 'password', message: 'Password must contain at least one lowercase letter' }
    }

    if (!/[0-9]/.test(password)) {
        return { field: 'password', message: 'Password must contain at least one number' }
    }

    // Optional: Check for special characters
    // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    //     return { field: 'password', message: 'Password must contain at least one special character' }
    // }

    return null
}

export function validateSignupInput(
    email: string,
    username: string,
    password: string
): ValidationError[] {
    const errors: ValidationError[] = []

    const emailError = validateEmail(email)
    if (emailError) errors.push(emailError)

    const usernameError = validateUsername(username)
    if (usernameError) errors.push(usernameError)

    const passwordError = validatePassword(password)
    if (passwordError) errors.push(passwordError)

    return errors
}

export function normalizeEmail(email: string): string {
    return email.toLowerCase().trim()
}

export function normalizeUsername(username: string): string {
    return username.trim()
}
