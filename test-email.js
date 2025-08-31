require('dotenv').config();
const RealEmailProvider = require('./providers/real-email-provider');

console.log('🧪 Testing email sending...');

const emailProvider = new RealEmailProvider();

// Test email
const testEmail = {
    to: process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com',
    subject: 'TEST: WhatsApp Report Verification',
    text: 'This is a test email to verify that the email system is working properly.\n\nIf you receive this, the WhatsApp Mass Reporter bot is configured correctly!'
};

console.log('📧 Sending test email to:', testEmail.to);

emailProvider.sendEmail(testEmail.to, testEmail.subject, testEmail.text)
    .then(result => {
        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', result.messageId);
        } else {
            console.log('❌ Failed to send email:', result.message);
            console.log('💡 Please check your SMTP configuration in .env file');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
