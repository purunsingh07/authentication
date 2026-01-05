import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from "../config/emailTemplates.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing details" });
    }

    const emailLower = email.toLowerCase();
    const existingUser = await userModel.findOne({ email: emailLower });

    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email: emailLower,
      password: hashedPassword
    });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // --- Sending welcome email (Asynchronous / Non-blocking) ---
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'Welcome to BITS&tat',
      text: `Welcome to bits&tat website. Your account has been created with email id: ${email}`
    };

    // Removed 'await' so the response is sent to user immediately
    transporter.sendMail(mailOptions).catch(err => console.error("Registration Mail Error:", err));

    return res.status(201).json({ success: true, message: "Registration successful" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ... login and logout remain the same (they don't send mail) ...

export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.json({ success: false, message: "User not authenticated" });
    }

    const user = await userModel.findById(userId);

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isAccountVerified) return res.json({ success: false, message: "Account already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification - OTP",
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email)
    };

    // Removed 'await' to prevent Render timeout
    transporter.sendMail(mailOption).catch(err => console.error("OTP Mail Error:", err));

    return res.json({ success: true, message: "OTP sent to your email" });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email: email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset - OTP",
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email)
    };

    // Removed 'await' to prevent Render timeout
    transporter.sendMail(mailOption).catch(err => console.error("Reset Mail Error:", err));

    return res.json({ success: true, message: "OTP sent to your email" });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};