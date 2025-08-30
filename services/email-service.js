const TempMailProviders = require('../providers/temp-mail-providers');
const { v4: uuidv4 } = require('uuid');

class EmailService {
    constructor() {
        this.tempMail = new TempMailProviders();
        this.sentEmails = new Map();
        this.sentCount = 0;
    }

    async sendWhatsAppReport(reportData) {
        const { content, subject, email: recipientEmail } = reportData;
        
        // Generate temporary email
        const tempEmailInfo = await this.tempMail.getRandomEmail();
        const fromEmail = tempEmailInfo.email;

        // Send the email
        const sendResult = await this.tempMail.sendEmail(
            fromEmail,
            recipientEmail,
            subject,
            content
        );

        // Store record
        const emailId = uuidv4();
        const emailRecord = {
            id: emailId,
            from: fromEmail,
            to: recipientEmail,
            subject,
            timestamp: new Date(),
            provider: tempEmailInfo.provider,
            sendResult,
            reportData: {
                phoneNumber: reportData.phoneNumber,
                category: reportData.category
            }
        };

        this.sentEmails.set(emailId, emailRecord);
        this.sentCount++;

        // Clean up old records
        if (this.sentEmails.size > 1000) {
            const keys = Array.from(this.sentEmails.keys());
            for (let i = 0; i < keys.length - 1000; i++) {
                this.sentEmails.delete(keys[i]);
            }
        }

        return emailRecord;
    }

    getStats() {
        const total = this.sentCount;
        const successful = Array.from(this.sentEmails.values())
            .filter(e => e.sendResult.success).length;
        const failed = total - successful;

        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%'
        };
    }

    getRecentEmails(limit = 10) {
        const emails = Array.from(this.sentEmails.values());
        return emails
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
}

module.exports = EmailService;
