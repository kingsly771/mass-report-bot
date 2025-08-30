const axios = require('axios');
const nodemailer = require('nodemailer');

class TempMailProviders {
    constructor() {
        this.providers = this.initializeProviders();
        this.smtpTransporter = this.createSMTPTransport();
    }

    createSMTPTransport() {
        try {
            return nodemailer.createTransport({
                service: process.env.SMTP_SERVICE || 'gmail',
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true' || false,
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100
            });
        } catch (error) {
            console.error('❌ Failed to create SMTP transport:', error.message);
            return null;
        }
    }

    initializeProviders() {
        return [
            {
                name: 'Gmail-SMTP',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    return `${random}@gmail.com`;
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
            },
            {
                name: 'Custom-SMTP',
                getEmail: () => {
                    const random = Math.random().toString(36).substring(2, 10);
                    const domains = ['tempmail.com', 'disposable.com', 'mailinator.com'];
                    const domain = domains[Math.floor(Math.random() * domains.length)];
                    return `${random}@${domain}`;
                },
                sendEmail: async (from, to, subject, text) => {
                    return await this.sendViaSMTP(from, to, subject, text);
                }
            }
        ];
    }

    async sendViaSMTP(from, to, subject, text) {
        try {
            if (!this.smtpTransporter) {
                throw new Error('SMTP transporter not initialized');
            }

            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: text,
                headers: {
                    'X-Mailer': process.env.EMAIL_X_MAILER || 'WhatsApp Mass Reporter Bot',
                    'X-Priority': '1',
                    'Importance': 'high',
                    'Priority': 'urgent'
                }
            };

            const result = await this.smtpTransporter.sendMail(mailOptions);
            
            return {
                success: true,
                message: `Email delivered: ${result.messageId}`,
                provider: 'SMTP'
            };
        } catch (error) {
            console.error('❌ SMTP Error:', error.message);
            
            // Fallback: try direct SMTP connection
            return await this.fallbackSMTP(from, to, subject, text, error);
        }
    }

    async fallbackSMTP(from, to, subject, text, originalError) {
        try {
            // Create a new transport for fallback
            const fallbackTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: from,
                to: to,
                subject: subject,
                text: text
            };

            const result = await fallbackTransporter.sendMail(mailOptions);
            
            // Close the fallback transporter
            fallbackTransporter.close();
            
            return {
                success: true,
                message: `Email delivered (fallback): ${result.messageId}`,
                provider: 'SMTP-Fallback'
            };
        } catch (fallbackError) {
            console.error('❌ Fallback SMTP also failed:', fallbackError.message);
            
            return {
                success: false,
                message: `Failed after fallback: ${fallbackError.message}`,
                provider: 'SMTP',
                originalError: originalError.message
            };
        }
    }

    async getRandomEmail() {
        try {
            const provider = this.providers[Math.floor(Math.random() * this.providers.length)];
            const email = await provider.getEmail();
            return {
                email,
                provider: provider.name
            };
        } catch (error) {
            console.error('Error generating random email:', error);
            // Fallback email generation
            const random = Math.random().toString(36).substring(2, 10);
            return {
                email: `${random}@fallback.com`,
                provider: 'Fallback'
            };
        }
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
            console.error('❌ Provider error:', error);
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

    // Verify SMTP connection
    async verifySMTP() {
        try {
            if (!this.smtpTransporter) {
                return { success: false, message: 'SMTP transporter not initialized' };
            }
            
            await this.smtpTransporter.verify();
            return { success: true, message: 'SMTP connection verified' };
        } catch (error) {
            return { success: false, message: `SMTP verification failed: ${error.message}` };
        }
    }

    // Close SMTP connection
    close() {
        if (this.smtpTransporter) {
            this.smtpTransporter.close();
            console.log('SMTP transporter closed');
        }
    }
}

module.exports = TempMailProviders;
