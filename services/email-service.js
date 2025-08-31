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
        this.retryInterval = setInterval(() => {
            this.processRetryQueue();
        }, config.EMAIL_RETRY_DELAY);
        
        console.log('✅ Email service initialized');
    }

    async sendWhatsAppReport(reportData, attempt = 1) {
        const { content, subject, email: recipientEmail } = reportData;
        
        try {
            console.log(`📧 Sending email attempt ${attempt} to: ${recipientEmail}`);

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
                subject: subject,
                timestamp: new Date(),
                sendResult: sendResult,
                reportData: {
                    phoneNumber: reportData.phoneNumber,
                    category: reportData.category
                },
                attempt: attempt
            };

            this.sentEmails.set(emailId, emailRecord);
            this.sentCount++;

            console.log(`✅ Email ${attempt > 1 ? 'retry ' : ''}result:`, sendResult.success ? 'SUCCESS' : 'FAILED');

            // If failed, add to retry queue
            if (!sendResult.success && attempt < config.MAX_EMAIL_ATTEMPTS) {
                console.log(`🔄 Queueing for retry (attempt ${attempt + 1})`);
                this.queueForRetry(reportData, attempt + 1);
            }

            this.cleanupOldRecords();

            return emailRecord;

        } catch (error) {
            console.error('❌ Email sending error:', error.message);
            
            if (attempt < config.MAX_EMAIL_ATTEMPTS) {
                console.log(`🔄 Queueing for retry after error (attempt ${attempt + 1})`);
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
        const results = {
            successful: 0,
            failed: 0,
            emails: []
        };

        console.log(`📨 Starting batch of ${count} emails...`);

        for (let i = 0; i < count; i++) {
            try {
                // Add variation to each email
                const uniqueReportData = {
                    ...reportData,
                    subject: `${reportData.subject} - Report ${i + 1}`,
                    content: this.addEmailVariation(reportData.content, i)
                };

                const emailResult = await this.sendWhatsAppReport(uniqueReportData);
                
                if (emailResult.sendResult && emailResult.sendResult.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }
                
                results.emails.push(emailResult);

                // Delay between emails
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, config.EMAIL_SEND_DELAY));
                }

            } catch (error) {
                console.error('❌ Error in batch sending:', error);
                results.failed++;
                results.emails.push({
                    success: false,
                    message: error.message,
                    attempt: 1
                });
                
                // Short delay even on error
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`📊 Batch complete: ${results.successful}/${count} successful`);
        return results;
    }

    addEmailVariation(content, index) {
        const variations = [
            '\n\nThis is my formal complaint regarding the above matter.',
            '\n\nI hope you will take appropriate action on this report.',
            '\n\nThank you for your attention to this serious matter.',
            '\n\nPlease investigate this issue promptly.',
            '\n\nI look forward to your response and action.',
            '\n\nThis behavior violates WhatsApp\'s terms of service.',
            '\n\nI request immediate action against this number.',
            '\n\nThis has been causing ongoing issues.',
            '\n\nPlease review this matter urgently.',
            '\n\nThank you for addressing this concern.'
        ];

        const variation = variations[index % variations.length];
        return content + variation;
    }

    queueForRetry(reportData, nextAttempt) {
        const retryId = uuidv4();
        const retryTime = Date.now() + (config.EMAIL_RETRY_DELAY * (nextAttempt - 1));
        
        this.failedEmails.set(retryId, {
            reportData: reportData,
            nextAttempt: nextAttempt,
            retryTime: retryTime,
            retryCount: nextAttempt - 1
        });

        console.log(`⏰ Queued for retry at ${new Date(retryTime).toLocaleTimeString()} (attempt ${nextAttempt})`);
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

        if (toRetry.length > 0) {
            console.log(`🔄 Processing ${toRetry.length} emails from retry queue...`);
        }

        // Process retries
        for (const { id, email } of toRetry) {
            try {
                console.log(`🔄 Retrying email (attempt ${email.nextAttempt})...`);
                const result = await this.sendWhatsAppReport(email.reportData, email.nextAttempt);
                
                // Remove from retry queue if successful or max attempts reached
                if (result.sendResult && result.sendResult.success) {
                    this.failedEmails.delete(id);
                    console.log('✅ Retry successful, removed from queue');
                } else if (email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                    this.failedEmails.delete(id);
                    console.log('❌ Max retry attempts reached, removed from queue');
                }
            } catch (error) {
                console.error('❌ Retry failed:', error.message);
                // Keep in queue for next retry if attempts remain
                if (email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                    this.failedEmails.delete(id);
                    console.log('❌ Max retry attempts reached, removed from queue');
                }
            }
        }
    }

    cleanupOldRecords() {
        // Clean sent emails (keep last 1000)
        if (this.sentEmails.size > 1000) {
            const keys = Array.from(this.sentEmails.keys());
            const toDelete = keys.length - 1000;
            
            for (let i = 0; i < toDelete; i++) {
                this.sentEmails.delete(keys[i]);
            }
            
            console.log(`🧹 Cleaned ${toDelete} old sent email records`);
        }

        // Clean old failed emails (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        let cleanedFailed = 0;
        
        for (const [id, email] of this.failedEmails.entries()) {
            if (email.retryTime < oneHourAgo && email.nextAttempt >= config.MAX_EMAIL_ATTEMPTS) {
                this.failedEmails.delete(id);
                cleanedFailed++;
            }
        }

        if (cleanedFailed > 0) {
            console.log(`🧹 Cleaned ${cleanedFailed} old failed email records`);
        }
    }

    getStats() {
        const total = this.sentCount;
        const successful = Array.from(this.sentEmails.values())
            .filter(e => e.sendResult && e.sendResult.success).length;
        const failed = total - successful;
        const pendingRetry = this.failedEmails.size;

        const successRate = total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%';

        return {
            total: total,
            successful: successful,
            failed: failed,
            pendingRetry: pendingRetry,
            successRate: successRate
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

    getQueueStatus() {
        return {
            totalQueued: this.failedEmails.size,
            nextRetryTime: this.getNextRetryTime(),
            active: this.failedEmails.size > 0
        };
    }

    getNextRetryTime() {
        if (this.failedEmails.size === 0) return null;
        
        let earliestTime = Infinity;
        for (const email of this.failedEmails.values()) {
            if (email.retryTime < earliestTime) {
                earliestTime = email.retryTime;
            }
        }
        
        return new Date(earliestTime);
    }

    close() {
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
        }
        
        if (this.emailProvider) {
            this.emailProvider.close();
        }
        
        console.log('✅ Email service closed');
    }

    // Test email sending
    async testEmailSending() {
        console.log('🧪 Testing email sending...');
        
        const testData = {
            content: 'This is a test email from WhatsApp Mass Reporter Bot.\n\nIf you receive this, the email system is working correctly!',
            subject: 'TEST: WhatsApp Reporter Bot - Email Test',
            email: config.WHATSAPP_SUPPORT_EMAIL,
            phoneNumber: '+10000000000',
            category: 'Test'
        };

        try {
            const result = await this.sendWhatsAppReport(testData);
            return {
                success: result.sendResult ? result.sendResult.success : false,
                message: result.sendResult ? result.sendResult.message : 'Unknown error',
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = EmailService;
