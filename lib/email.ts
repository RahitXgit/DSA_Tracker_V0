import { Resend } from 'resend'

let resend: Resend | null = null;

function getResendClient() {
    if (!resend) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not defined in environment variables')
        }
        resend = new Resend(process.env.RESEND_API_KEY)
    }
    return resend;
}


const FROM_EMAIL = 'onboarding@resend.dev' // Resend's test email for development
const APP_NAME = 'DSA Tracker'

export async function sendWelcomeEmail(email: string, username: string) {
    try {
        const resendClient = getResendClient();
        const { welcomeEmailTemplate } = await import('./email-templates')

        const { data, error } = await resendClient.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject: `Welcome to ${APP_NAME} - Pending Approval`,
            html: welcomeEmailTemplate(username)
        })

        if (error) {
            console.error('Error sending welcome email:', error)
            throw error
        }

        console.log('Welcome email sent successfully:', data)
        return data
    } catch (error) {
        console.error('Failed to send welcome email:', error)
        throw error
    }
}

export async function sendApprovalEmail(email: string, username: string) {
    try {
        const resendClient = getResendClient();
        const { approvalEmailTemplate } = await import('./email-templates')
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

        const { data, error } = await resendClient.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject: `🎉 Your ${APP_NAME} Account Has Been Approved!`,
            html: approvalEmailTemplate(username, loginUrl)
        })

        if (error) {
            console.error('Error sending approval email:', error)
            throw error
        }

        console.log('Approval email sent successfully:', data)
        return data
    } catch (error) {
        console.error('Failed to send approval email:', error)
        throw error
    }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
    try {
        const resendClient = getResendClient();
        const { passwordResetTemplate } = await import('./email-templates')
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

        const { data, error } = await resendClient.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: email,
            subject: `Reset Your ${APP_NAME} Password`,
            html: passwordResetTemplate(resetUrl)
        })

        if (error) {
            console.error('Error sending password reset email:', error)
            throw error
        }

        console.log('Password reset email sent successfully:', data)
        return data
    } catch (error) {
        console.error('Failed to send password reset email:', error)
        throw error
    }
}
