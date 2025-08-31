const RealEmailProvider = require('../providers/real-email-provider');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class EmailService {
    constructor() {
        this.emailProvider = new RealEmailProvider();
        this.sentEmails = new Map();
        this.sentCount = 0;
        this.failedEmails = new Map();
        
        // Start retry processor
        setInterval(() => {
            this.processRetryQueue();
        }, 30000);
    }

    async sendWhatsAppReport(reportData, attempt = 1) {
        const { content, subject, email: recipientEmail } = reportData;
        
        try {
            // Send the email using real SMTP
            const sendResult = await this.emailProvider.sendEmail(
                recipientEmail,
                subject,
                content
            );

            // Store record
            const emailId = uuidv4();
            const emailRecord = {
                id: emailId,
                to: recipientEmail,
                subject,
                timestamp: new Date(),
                sendResult,
                reportData: {
                    phoneNumber: reportData.phoneNumber,
                    category: reportData.category
                },
                attempt: attempt
            };

            this.sentEmails.set(emailId, emailRecord);
            this.sentCount++;

            // If failed, add to retry queue
            if (!sendResult.success && attempt < config.MAX_EMAIL_ATTEMPTS) {
                this.queueForRetry(reportData, attempt + 1);
            }

            this.cleanupOldRecords();

            return emailRecord;

        } catch (error) {
            console.error('Email sending error:', error);
            
            if (attempt < config.MAX_EMAIL_ATTEMPTS) {
                this.queueForRetry(reportData, attempt + 1);
            }

            return {
                success: false,
                message: `Error: ${error.message}`,
                attempt: attempt
            };
        }
    }

    async sendMultipleReports(reportData, count) {
        const { content, subject, email: recipientEmail } = reportData;
        
        try {
            const results = await this.emailProvider.sendMultipleEmails(
                recipientEmail,
                subject,
                content,
                count
            );

            // Store all results
            results.forEach((result, index) => {
                const emailId = uuidv4();
                const emailRecord = {
                    id: emailId,
                    to: recipientEmail,
                    subject: `${subject} - Report ${index + 1}`,
                    timestamp: new Date(),
                    sendResult: result,
                    reportData: {
                        phoneNumber: reportData.phoneNumber,
                        category: reportData.category
                    },
                    attempt: 1
                };
                this.sentEmails.set(emailId, emailRecord);
            });

            this.sentCount += count;
            return results;

        } catch (error) {
            console.error('Multiple email sending error:', error);
            throw error;
        }
    }

    queueForRetry(reportData, nextAttempt) {
        const retryId = uuidv4();
        const retryTime = Date.now() + (config.EMAIL_RETRY_DELAY * nextAttempt);
        
        this.failedEmails.set(retryId, {
            reportData,
            nextAttempt,
            retryTime,
            retryCount: nextAttempt - 1
        });

        console.log(`Queued for retry (attempt ${nextAttempt})`);
    }

    async processRetryQueue() {
        const now = Date.now();
        const toRetry = [];

        for (const [id, email] of this.failedEmails.entries()) {
            if (email.retryTime <= now) {
                toRetry.push({ id, email });
            }
        }

        for (const { id, email } of toRetry) {
            try {
                console.log(`Retrying email (attempt ${email.nextAttempt})...`);
                await this.sendWhatsAppReport(email.reportData, email.nextAttempt);
                this.failedEmails.delete(id);
            } catch (error) {
                console.error('Retry failed:', error);
                if (email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                    this.failedEmails.delete(id);
                }
            }
        }
    }

    cleanupOldRecords() {
        if (this.sentEmails.size > 1000) {
            const keys = Array.from(this.sentEmails.keys());
            for (let i = 0; i < keys.length - 1000; i++) {
                this.sentEmails.delete(keys[i]);
            }
        }

        const oneHourAgo = Date.now() - 3600000;
        for (const [id, email] of this.failedEmails.entries()) {
            if (email.retryTime < oneHourAgo && email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                this.failedEmails.delete(id);
            }
        }
    }

    getStats() {
        const total = this.sentCount;
        const successful = Array.from(this.sentEmails.values())
            .filter(e => e.sendResult && e.sendResult.success).length;
        const failed = total - successful;
        const pendingRetry = this.failedEmails.size;

        return {
            total,
            successful,
            failed,
            pendingRetry,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%'
        };
    }

    getRecentEmails(limit = 10) {
        const emails = Array.from(this.sentEmails.values());
        return emails
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getFailedEmails() {
        return Array.from(this.failedEmails.values());
    }

    close() {
        if (this.emailProvider) {
            this.emailProvider.close();
        }
    }
}

module.exports = EmailService;
