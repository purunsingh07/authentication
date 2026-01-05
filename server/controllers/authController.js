import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE,PASSWORD_RESET_TEMPLATE } from "../config/emailTemplates.js";

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

    //sending welcome email

    const mailOptions={
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: 'welcome to BITS&tat',
        text: `Welcome to bits&tat website.Your account has been created with email id:${email}`
    }

    await transporter.sendMail(mailOptions);

    return res.status(201).json({ success: true, message: "Registration successful" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing details" });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

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

    return res.status(200).json({ success: true, message: "Login successful" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
    });

    return res.status(200).json({ success: true, message: "Logout successful" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


//send otp for verification

export const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.user?.userId; // ✅ get it safely

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
      // text: `Your OTP for account verification is: ${otp}. It is valid for 10 minutes.`,
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
    };

    await transporter.sendMail(mailOption);

    return res.json({ success: true, message: "OTP sent to your email" });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};



export const verifyEmail = async (req, res) => {
  try {
    const userId = req.user?.userId; // ✅ get it from JWT middleware
    const { otp } = req.body || {};

    if (!userId || !otp) {
      return res.json({ success: false, message: "Missing details" });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.verifyOtp === '' || user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;

    await user.save();

    return res.json({ success: true, message: "Account verified successfully" });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};



export const isAuthenticated = async (req, res) => {
  try {

    return res.json({success:true, message:"User is authenticated"});
    
  } catch (error) {
    res.json({success:false, message:error.message});
    
  }
}



//Send password reset otp

export const sendResetOtp = async (req, res) => {
   const {email} = req.body;

   if(!email){
    return res.json({success:false, message:"Email is required"});
   }

   try {
      const user = await userModel.findOne({email:email});

      if(!user){
        return res.json({success:false, message:"User not found"});
      }

     const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset - OTP",
      // text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)
    };

    await transporter.sendMail(mailOption);

    return res.json({success:true, message:"OTP sent to your email"});
    
   } catch (error) {
     res.json({success:false, message:error.message});
   }
}


export const resetPassword = async (req, res) => {
    const {email, otp, newPassword} = req.body;

    if(!email || !otp || !newPassword){
        return res.json({success:false, message:"Missing details"});
    }

    try {
      const user = await userModel.findOne({email});

      if(!user){
        return res.json({success:false, message:"User not found"});
      }

      if(user.resetOtp === '' || user.resetOtp !== otp){
        return res.json({success:false, message:"Invalid OTP"});
      }

      if(user.resetOtpExpireAt < Date.now()){
        return res.json({success:false, message:"OTP expired"});
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      user.resetOtp = '';
      user.resetOtpExpireAt = 0;
      await user.save();

      return res.json({success:true, message:"Password reset successful"});

    } catch (error) {
      res.json({success:false, message:error.message});
    }
}

