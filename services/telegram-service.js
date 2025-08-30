const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const ReportService = require('./report-service');
const EmailService = require('./email-service');

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
        this.reportService = new ReportService();
        this.emailService = new EmailService();
        this.userSessions = new Map();
        
        this.initializeHandlers();
    }

    initializeHandlers() {
        this.bot.onText(/\/start/, this.handleStart.bind(this));
        this.bot.onText(/\/report/, this.handleReport.bind(this));
        this.bot.onText(/\/mystats/, this.handleStats.bind(this));
        this.bot.onText(/\/emailstats/, this.handleEmailStats.bind(this));
        this.bot.onText(/\/help/, this.handleHelp.bind(this));
        this.bot.on('message', this.handleMessage.bind(this));
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        const message = `🚨 *WhatsApp Mass Reporter Bot* 🚨

Send 10-100 reports automatically to WhatsApp support using different email addresses.

*✨ Features:*
- Send 10-100 reports per session
- Different temp emails for each report
- Real-time progress updates
- Automatic delivery

*📊 Limits:*
- ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- ${config.MAX_REPORTS_PER_HOUR} reports per hour

Use /report to start mass reporting!`;

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    handleReport(msg) {
        const chatId = msg.chat.id;
        const stats = this.reportService.getUserReportStats(chatId);
        
        if (!stats.canReport) {
            this.bot.sendMessage(chatId, 
                `❌ *Rate Limit Exceeded*\n\nYou've sent ${stats.reportsToday}/${config.MAX_REPORTS_PER_HOUR} reports this hour. Try again later.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        this.userSessions.set(chatId, { step: 'awaiting_number' });
        this.bot.sendMessage(chatId, 
            '📱 *Step 1/5:* Enter WhatsApp number with country code:\n\nExample: +1234567890',
            { parse_mode: 'Markdown' }
        );
    }

    // ... other handler methods ...

    async handleMassReporting(chatId, session) {
        try {
            const reportTemplate = this.reportService.generateReportTemplate(session);
            const progressMsg = await this.bot.sendMessage(chatId,
                `⏳ *Starting ${session.quantity} reports...*\n\nPreparing email services...`,
                { parse_mode: 'Markdown' }
            );

            const results = await this.sendMultipleReports(chatId, reportTemplate, session.quantity, progressMsg);
            await this.sendSummary(chatId, results, session, progressMsg);
            
            this.reportService.updateUserReportCount(chatId, session.quantity);

        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
        
        this.userSessions.delete(chatId);
    }

    async sendMultipleReports(chatId, reportTemplate, quantity, progressMsg) {
        const results = { successful: 0, failed: 0, emails: [] };
        
        for (let i = 0; i < quantity; i++) {
            // Update progress
            if (i % 10 === 0) {
                await this.updateProgress(chatId, progressMsg, i, quantity, results);
            }

            try {
                const emailResult = await this.emailService.sendWhatsAppReport(reportTemplate);
                if (emailResult.sendResult.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }
                results.emails.push(emailResult);
                
                await new Promise(resolve => setTimeout(resolve, config.EMAIL_SEND_DELAY));
            } catch (error) {
                results.failed++;
            }
        }
        
        return results;
    }

    async updateProgress(chatId, progressMsg, current, total, results) {
        const progressText = `📧 *Progress: ${current}/${total}*\n\n✅ ${results.successful} successful\n❌ ${results.failed} failed`;
        await this.bot.editMessageText(progressText, {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

module.exports = TelegramService;
