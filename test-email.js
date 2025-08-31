require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration');
console.log('='.repeat(50));

// Read configuration from environment variables
const config = {
    SMTP_SERVICE: process.env.SMTP_SERVICE || 'gmail',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SMTP_EMAIL: process.env.SMTP_EMAIL,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    WHATSAPP_SUPPORT_EMAIL: process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com'
};

// Validate configuration
console.log('📋 Configuration Check:');
console.log(`   SMTP Service: ${config.SMTP_SERVICE}`);
console.log(`   SMTP Host: ${config.SMTP_HOST}`);
console.log(`   SMTP Port: ${config.SMTP_PORT}`);
console.log(`   SMTP Secure: ${config.SMTP_SECURE}`);
console.log(`   From Email: ${config.SMTP_EMAIL ? '✅ Set' : '❌ Missing'}`);
console.log(`   SMTP Password: ${config.SMTP_PASSWORD ? '✅ Set' : '❌ Missing'}`);
console.log(`   Target Email: ${config.WHATSAPP_SUPPORT_EMAIL}`);

// Check if required fields are set
if (!config.SMTP_EMAIL || !config.SMTP_PASSWORD) {
    console.log('\n❌ ERROR: SMTP_EMAIL and SMTP_PASSWORD are required in .env file');
    console.log('\n💡 How to fix:');
    console.log('   1. Open your .env file');
    console.log('   2. Set SMTP_EMAIL=your_email@gmail.com');
    console.log('   3. Set SMTP_PASSWORD=your_app_password');
    console.log('   4. For Gmail, use App Password (not regular password)');
    process.exit(1);
}

// Create SMTP transporter
console.log('\n🔧 Creating SMTP transporter...');
let transporter;

try {
    transporter = nodemailer.createTransport({
        service: config.SMTP_SERVICE,
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: {
            user: config.SMTP_EMAIL,
            pass: config.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates
        }
    });

    console.log('✅ SMTP transporter created successfully');
} catch (error) {
    console.log('❌ Failed to create SMTP transporter:', error.message);
    process.exit(1);
}

// Test SMTP connection
console.log('\n📡 Testing SMTP connection...');
try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    console.log('   ✅ Server is ready to accept emails');
} catch (error) {
    console.log('❌ SMTP connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check your SMTP credentials');
    console.log('   2. For Gmail: enable 2-factor authentication');
    console.log('   3. For Gmail: generate App Password (not regular password)');
    console.log('   4. Check if less secure apps are enabled');
    console.log('   5. Verify your internet connection');
    process.exit(1);
}

// Test email content
const testEmail = {
    from: `"WhatsApp Test Bot" <${config.SMTP_EMAIL}>`,
    to: config.WHATSAPP_SUPPORT_EMAIL,
    subject: 'TEST: WhatsApp Mass Reporter - Email Test',
    text: `This is a test email from WhatsApp Mass Reporter Bot.

📧 Email System Test Results:
- SMTP Service: ${config.SMTP_SERVICE}
- From: ${config.SMTP_EMAIL}
- To: ${config.WHATSAPP_SUPPORT_EMAIL}
- Time: ${new Date().toLocaleString()}

If you receive this email, your SMTP configuration is working correctly!
The bot will be able to send reports to WhatsApp support.

Thank you for testing the WhatsApp Mass Reporter Bot.

---
This is an automated test message.`,
    headers: {
        'X-Mailer': 'WhatsApp Mass Reporter Test',
        'X-Priority': '1',
        'Importance': 'high'
    }
};

// Send test email
console.log('\n📤 Sending test email...');
console.log(`   From: ${testEmail.from}`);
console.log(`   To: ${testEmail.to}`);
console.log(`   Subject: ${testEmail.subject}`);

try {
    const result = await transporter.sendMail(testEmail);
    
    console.log('\n✅ SUCCESS: Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
    
    console.log('\n🎉 Congratulations! Your email configuration is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm start');
    console.log('   2. Message your bot on Telegram with /start');
    console.log('   3. Use /report to start mass reporting');
    
} catch (error) {
    console.log('\n❌ FAILED: Email sending failed:', error.message);
    
    console.log('\n🔧 Common solutions:');
    
    if (error.code === 'EAUTH') {
        console.log('   • Invalid email or password');
        console.log('   • For Gmail: Use App Password, not regular password');
        console.log('   • Enable 2-factor authentication');
    }
    else if (error.code === 'ECONNECTION') {
        console.log('   • Connection refused');
        console.log('   • Check SMTP host and port');
        console.log('   • Check firewall/network settings');
    }
    else if (error.code === 'ETIMEDOUT') {
        console.log('   • Connection timeout');
        console.log('   • Check your internet connection');
    }
    else {
        console.log('   • Check SMTP configuration');
        console.log('   • Verify email credentials');
    }
    
    console.log('\n💡 Gmail-specific help:');
    console.log('   1. Go to: https://myaccount.google.com/');
    console.log('   2. Enable 2-factor authentication');
    console.log('   3. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('   4. Select "Mail" and device "Other", name it "WhatsApp Bot"');
    console.log('   5. Use the 16-digit app password in your .env file');
}

// Close transporter
console.log('\n🔚 Closing SMTP connection...');
transporter.close();
console.log('✅ Test completed');
