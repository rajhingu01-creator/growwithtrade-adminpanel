
const nodemailer = require('nodemailer');
require('dotenv').config();

const testSmtp = async () => {
  console.log('--- SMTP Diagnostic ---');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ SMTP connection is successful!');
    
    // Optional: send a test email to the user email itself
    if (process.env.SMTP_USER) {
        console.log(`Sending test email to ${process.env.SMTP_USER}...`);
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: 'SMTP Diagnostic Test',
            text: 'If you are reading this, your SMTP configuration is working correctly!'
        });
        console.log('✅ Test email sent successfully!');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ SMTP Diagnostic failed:', error);
    process.exit(1);
  }
};

testSmtp();
