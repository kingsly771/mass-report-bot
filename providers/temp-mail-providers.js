const axios = require('axios');
const nodemailer = require('nodemailer');

class TempMailProviders {
    constructor() {
        this.providers = this.initializeProviders();
    }

    initializeProviders() {
        return [
            // Disposable email services with SMTP
            {
                name: 'Mailinator',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@mailinator.com`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            },
            {
                name: 'TempMail',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@tempmail.com`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            },
            {
                name: 'Disposable',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@disposable.com`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            }
        ];
    }

    async sendViaSMTP(from, to, subject, text) {
        try {
            // Create SMTP transporter (using Gmail as relay)
            const transporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: text,
                headers: {
                    'X-Mailer': 'WhatsApp Mass Reporter Bot'
                }
            };

            const result = await transporter.sendMail(mailOptions);
            return {
                success: true,
                message: `Email sent via SMTP: ${result.messageId}`,
                provider: 'SMTP'
            };
        } catch (error) {
            return {
                success: false,
                message: `SMTP Error: ${error.message}`,
                provider: 'SMTP'
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
