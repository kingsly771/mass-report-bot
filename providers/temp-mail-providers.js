const axios = require('axios');
const nodemailer = require('nodemailer');

class TempMailProviders {
    constructor() {
        this.providers = this.initializeProviders();
        this.smtpTransporter = this.createSMTPTransporter();
    }

    createSMTPTransporter() {
        return nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        });
    }

    initializeProviders() {
        return [
            {
                name: 'Gmail-SMTP',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@gmail.com`; // Use Gmail for better delivery
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            },
            {
                name: 'Outlook-SMTP',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@outlook.com`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            },
            {
                name: 'Yahoo-SMTP',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@yahoo.com`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            }
        ];
    }

    async sendViaSMTP(from, to, subject, text) {
        try {
            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: text,
                headers: {
                    'X-Mailer': 'WhatsApp Mass Reporter',
                    'X-Priority': '1', // High priority
                    'Importance': 'high'
                }
            };

            const result = await this.smtpTransporter.sendMail(mailOptions);
            
            return {
                success: true,
                message: `Email delivered: ${result.messageId}`,
                provider: 'SMTP'
            };
        } catch (error) {
            console.error('SMTP Error:', error.message);
            
            // Retry with different approach
            return await this.retrySendEmail(from, to, subject, text, error);
        }
    }

    async retrySendEmail(from, to, subject, text, originalError) {
        try {
            // Alternative approach: Use different SMTP configuration
            const backupTransporter = nodemailer.createTransporter({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: text
            };

            const result = await backupTransporter.sendMail(mailOptions);
            
            return {
                success: true,
                message: `Email delivered (retry): ${result.messageId}`,
                provider: 'SMTP-Retry'
            };
        } catch (retryError) {
            return {
                success: false,
                message: `Failed after retry: ${retryError.message}`,
                provider: 'SMTP',
                originalError: originalError.message
            };
        }
    }

    async getRandomEmail() {
        const provider = this.providers[Math.floor(Math.random() * this.providers.length)];
        const email = await provider.getEmail();
        return {
            email,
            provider: provider.name
        };
    }

    async sendEmail(fromEmail, toEmail, subject, message) {
        const provider = this.providers[Math.floor(Math.random() * this.providers.length)];
        
        try {
            const result = await provider.sendEmail(fromEmail, toEmail, subject, message);
            return {
                ...result,
                from: fromEmail,
                to: toEmail,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Provider error:', error);
            return {
                success: false,
                message: `Provider error: ${error.message}`,
                provider: provider.name,
                from: fromEmail,
                to: toEmail,
                timestamp: new Date()
            };
        }
    }
}

module.exports = TempMailProviders;
