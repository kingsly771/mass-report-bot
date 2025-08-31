const nodemailer = require('nodemailer');
const config = require('../config');

class RealEmailProvider {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        if (!config.SMTP_EMAIL || !config.SMTP_PASSWORD) {
            console.error('❌ SMTP credentials not configured');
            return;
        }

        this.transporter = nodemailer.createTransport({
            service: config.SMTP_SERVICE,
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: {
                user: config.SMTP_EMAIL,
                pass: config.SMTP_PASSWORD
            }
        });

        // Verify connection
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP connection verified successfully');
        } catch (error) {
            console.error('❌ SMTP connection failed:', error.message);
        }
    }

    async sendEmail(to, subject, text) {
        if (!this.transporter) {
            return {
                success: false,
                message: 'SMTP transporter not initialized'
            };
        }

        try {
            // Generate a random "from" name to make it look like different senders
            const randomNames = [
                'Concerned User', 'WhatsApp User', 'Community Member',
                'Safety Reporter', 'Platform User', 'Verified Account'
            ];
            const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
            
            const mailOptions = {
                from: `"${randomName}" <${config.SMTP_EMAIL}>`,
                to: to,
                subject: subject,
                text: text,
                headers: {
                    'X-Mailer': 'WhatsApp Mass Reporter',
                    'X-Priority': '1',
                    'Importance': 'high'
                }
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully'
            };
        } catch (error) {
            console.error('❌ Email sending error:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async sendMultipleEmails(to, subject, text, count) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            try {
                // Add slight variation to each email
                const uniqueSubject = `${subject} - Report ${i + 1}`;
                const uniqueText = this.addVariation(text, i);
                
                const result = await this.sendEmail(to, uniqueSubject, uniqueText);
                results.push({
                    attempt: i + 1,
                    success: result.success,
                    message: result.message
                });

                // Delay between emails to avoid rate limiting
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, config.EMAIL_SEND_DELAY));
                }
            } catch (error) {
                results.push({
                    attempt: i + 1,
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    addVariation(text, index) {
        // Add slight variations to make each email unique
        const variations = [
            '\n\nThis is my formal complaint regarding the above matter.',
            '\n\nI hope you will take appropriate action on this report.',
            '\n\nThank you for your attention to this serious matter.',
            '\n\nPlease investigate this issue promptly.',
            '\n\nI look forward to your response and action.'
        ];

        const variation = variations[index % variations.length];
        return text + variation;
    }

    close() {
        if (this.transporter) {
            this.transporter.close();
        }
    }
}

module.exports = RealEmailProvider;
