import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host:"smtp-relay.brevo.com",
    port:587,
    secure: false,
    auth:{
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
  connectionTimeout: 5000, 
  greetingTimeout: 5000,
  socketTimeout: 5000,

});


export default transporter;