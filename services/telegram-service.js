async handleMassReporting(chatId, session) {
    try {
        const reportTemplate = this.reportService.generateReportTemplate(session);
        
        const progressMsg = await this.bot.sendMessage(chatId,
            `⏳ *Starting ${session.quantity} reports...*\n\n📧 Preparing to send emails...\n⏰ Estimated time: ${Math.ceil((session.quantity * config.EMAIL_SEND_DELAY) / 1000)} seconds`,
            { parse_mode: 'Markdown' }
        );

        // Use the new multiple email sending method
        const results = await this.emailService.sendMultipleReports(reportTemplate, session.quantity);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        await this.sendDetailedSummary(chatId, { successful, failed, emails: results }, session, progressMsg);
        
        this.reportService.updateUserReportCount(chatId, session.quantity);

    } catch (error) {
        console.error('Mass reporting error:', error);
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}\n\nPlease try with fewer reports.`)
            .catch(err => console.error('Error sending error message:', err));
    }
    
    this.userSessions.delete(chatId);
}
