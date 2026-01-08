import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import transporter from './config/nodemailer.js';


const app = express();
const port = process.env.PORT || 4000
connectDB();
transporter.verify().then(() => {
    console.log("SMTP connection verified successfully");
}).catch((err) => {
    console.error("SMTP connection verification failed:", err);
});

const allowedOrigins = ['http://localhost:5173', 'https://authentication-c3vfjnhl5-purunsingh07s-projects.vercel.app', 'https://authentication-xi-one.vercel.app', 'https://authentication-6e3zjomfq-purunsingh07s-projects.vercel.app']

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));


// APi endpoints
app.get('/', (req, res) => {
    res.send('Api working ');
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);

app.listen(port, () => console.log(`server staretd on port:${port}`));
