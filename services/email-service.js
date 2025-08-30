const TempMailProviders = require('../providers/temp-mail-providers');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class EmailService {
    constructor() {
        this.tempMail = new TempMailProviders();
        this.sentEmails = new Map();
        this.sentCount = 0;
        this.failedEmails = new Map();
        
        // Start retry processor
        setInterval(() => {
            this.processRetryQueue();
        }, 30000); // Check every 30 seconds
    }

    async sendWhatsAppReport(reportData, attempt = 1) {
        const { content, subject, email: recipientEmail } = reportData;
        
        try {
            // Generate temporary email
            const tempEmailInfo = await this.tempMail.getRandomEmail();
            const fromEmail = tempEmailInfo.email;

            // Send the email with retry logic
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
                },
                attempt: attempt
            };

            this.sentEmails.set(emailId, emailRecord);
            this.sentCount++;

            // If failed, add to retry queue
            if (!sendResult.success && attempt < config.MAX_EMAIL_ATTEMPTS) {
                this.queueForRetry(reportData, attempt + 1);
            }

            // Clean up old records
            this.cleanupOldRecords();

            return emailRecord;

        } catch (error) {
            console.error('Email sending error:', error);
            
            // Queue for retry
            if (attempt < config.MAX_EMAIL_ATTEMPTS) {
                this.queueForRetry(reportData, attempt + 1);
            }

            return {
                success: false,
                message: `Initial error: ${error.message}`,
                attempt: attempt
            };
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

        console.log(`Queued for retry (attempt ${nextAttempt}) in ${config.EMAIL_RETRY_DELAY * nextAttempt}ms`);
    }

    async processRetryQueue() {
        const now = Date.now();
        const toRetry = [];

        // Collect emails ready for retry
        for (const [id, email] of this.failedEmails.entries()) {
            if (email.retryTime <= now) {
                toRetry.push({ id, email });
            }
        }

        // Process retries
        for (const { id, email } of toRetry) {
            try {
                console.log(`Retrying email (attempt ${email.nextAttempt})...`);
                await this.sendWhatsAppReport(email.reportData, email.nextAttempt);
                this.failedEmails.delete(id);
            } catch (error) {
                console.error('Retry failed:', error);
                // Keep in queue for next retry if attempts remain
                if (email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                    this.failedEmails.delete(id);
                }
            }
        }
    }

    cleanupOldRecords() {
        // Clean sent emails (keep last 1000)
        if (this.sentEmails.size > 1000) {
            const keys = Array.from(this.sentEmails.keys());
            for (let i = 0; i < keys.length - 1000; i++) {
                this.sentEmails.delete(keys[i]);
            }
        }

        // Clean old failed emails (older than 1 hour)
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
}

module.exports = EmailService;
