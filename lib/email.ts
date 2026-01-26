import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})

const FROM_EMAIL = process.env.GMAIL_USER || 'noreply@dsatracker.com'
const APP_NAME = 'DSA Tracker'

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Gmail SMTP Error:', error)
    } else {
        console.log('✅ Gmail SMTP is ready to send emails')
    }
})

export async function sendWelcomeEmail(email: string, username: string) {
    try {
        const { welcomeEmailTemplate } = await import('./email-templates')

        const info = await transporter.sendMail({
            from: `"${APP_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `Welcome to ${APP_NAME} - Pending Approval`,
            html: welcomeEmailTemplate(username),
        })

        console.log('✅ Welcome email sent:', info.messageId)
        return info
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error)
        throw error
    }
}

export async function sendApprovalEmail(email: string, username: string) {
    try {
        const { approvalEmailTemplate } = await import('./email-templates')
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`

        const info = await transporter.sendMail({
            from: `"${APP_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `🎉 Your ${APP_NAME} Account Has Been Approved!`,
            html: approvalEmailTemplate(username, loginUrl),
        })

        console.log('✅ Approval email sent:', info.messageId)
        return info
    } catch (error) {
        console.error('❌ Failed to send approval email:', error)
        throw error
    }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
    try {
        const { passwordResetTemplate } = await import('./email-templates')
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

        const info = await transporter.sendMail({
            from: `"${APP_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `Reset Your ${APP_NAME} Password`,
            html: passwordResetTemplate(resetUrl),
        })

        console.log('✅ Password reset email sent:', info.messageId)
        return info
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error)
        throw error
    }
}
