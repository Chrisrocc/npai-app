const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/Users');

// Test route
router.get('/test', (req, res) => {
  console.log('Auth test route accessed');
  res.send('Auth routes working');
});

// Get current user (protected route)
router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    console.log('No token provided in /me route');
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`User authenticated in /me route: id=${decoded.id}, email=${decoded.email}`);
    res.json({ id: decoded.id, email: decoded.email });
  } catch (error) {
    console.error(`Error verifying token in /me route: ${error.message}`);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(`Signup attempt: name=${name}, email=${email}`);

    if (!name || !email || !password) {
      console.log('Signup failed: Missing required fields');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Signup failed: Email already exists: ${email}`);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = new User({ name, email, password, verificationToken, isApproved: false });
    await user.save();
    console.log(`User created: email=${email}, verificationToken=${verificationToken}`);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      text: `Please verify your email by clicking this link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${verificationToken}`,
    };
    console.log('Sending verification email:', mailOptions.text);

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to: ${email}`);
    res.status(201).json({ message: 'User created. Please check your email to verify your account. An admin will need to approve your account before you can log in.' });
  } catch (error) {
    console.error(`Error in signup route: ${error.message}`);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Verify email route
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Email verification attempt: token=${token}`);

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      console.log('Verification failed: Invalid or expired token');
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();
    console.log(`Email verified successfully: email=${user.email}`);
    res.json({ message: 'Email verified successfully. Waiting for admin approval.' });
  } catch (error) {
    console.error(`Error in verify route: ${error.message}`);
    res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt: email=${email}`);

    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log(`User found: email=${email}, isVerified=${user.isVerified}, isApproved=${user.isApproved}`);
    if (!user.isVerified) {
      console.log(`Login failed: Email not verified: ${email}`);
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    if (!user.isApproved) {
      console.log(`Login failed: Account not approved: ${email}`);
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour in milliseconds
    });
    console.log(`Login successful: email=${email}, token=${token}`);
    console.log('Response headers:', res.getHeaders());
    res.json({ message: 'Login successful', user: { id: user._id, email: user.email }, token });
  } catch (error) {
    console.error(`Error in login route: ${error.message}`);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  console.log('Token cookie cleared');
  res.json({ message: 'Logout successful' });
});

// Get pending users (admin only)
router.get('/users/pending', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('Pending users request failed: No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log(`Pending users request failed: Invalid user: id=${decoded.id}`);
      return res.status(403).json({ message: 'Invalid user' });
    }

    if (user.email !== 'croccuzzo5@gmail.com') {
      console.log(`Pending users request failed: Admin access required: email=${user.email}`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    const pendingUsers = await User.find({ isApproved: false });
    console.log(`Fetched ${pendingUsers.length} pending users`);
    res.json(pendingUsers);
  } catch (error) {
    console.error(`Error in get pending users route: ${error.message}`);
    res.status(500).json({ message: 'Error fetching pending users', error: error.message });
  }
});

// Approve user (admin only)
router.post('/approve/:id', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('Approve user request failed: No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);
    if (!admin) {
      console.log(`Approve user request failed: Invalid admin: id=${decoded.id}`);
      return res.status(403).json({ message: 'Invalid user' });
    }

    if (admin.email !== 'croccuzzo5@gmail.com') {
      console.log(`Approve user request failed: Admin access required: email=${admin.email}`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`Approve user request failed: User not found: id=${req.params.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    user.isApproved = true;
    await user.save();
    console.log(`User approved: email=${user.email}`);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Account Approved',
      text: `Your account has been approved! You can now log in at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    };
    console.log('Sending approval email:', mailOptions.text);

    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to: ${user.email}`);
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error(`Error in approve user route: ${error.message}`);
    res.status(500).json({ message: 'Error approving user', error: error.message });
  }
});

// Reject user (admin only)
router.post('/reject/:id', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('Reject user request failed: No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await User.findById(decoded.id);
    if (!admin) {
      console.log(`Reject user request failed: Invalid admin: id=${decoded.id}`);
      return res.status(403).json({ message: 'Invalid user' });
    }

    if (admin.email !== 'croccuzzo5@gmail.com') {
      console.log(`Reject user request failed: Admin access required: email=${admin.email}`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`Reject user request failed: User not found: id=${req.params.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const userEmail = user.email;
    await user.deleteOne();
    console.log(`User rejected and deleted: email=${userEmail}`);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Account Rejected',
      text: `Your account request has been rejected. Please contact the admin for more information.`,
    };
    console.log('Sending rejection email:', mailOptions.text);

    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to: ${userEmail}`);
    res.json({ message: 'User rejected and removed' });
  } catch (error) {
    console.error(`Error in reject user route: ${error.message}`);
    res.status(500).json({ message: 'Error rejecting user', error: error.message });
  }
});

// Forgot Password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Forgot password request: email=${email}`);

    if (!email) {
      console.log('Forgot password failed: Email is required');
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Forgot password failed: Email not found: ${email}`);
      return res.status(400).json({ message: 'Email not found' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log(`Reset token generated for: email=${email}, token=${token}`);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      text: `Click this link to reset your password: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`,
    };
    console.log('Sending reset password email:', mailOptions.text);

    await transporter.sendMail(mailOptions);
    console.log(`Reset password email sent to: ${email}`);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(`Error in forgot-password route: ${error.message}`);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
});

// Reset Password route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    console.log(`Reset password attempt: token=${token}`);

    if (!password) {
      console.log('Reset password failed: New password is required');
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      console.log('Reset password failed: Invalid or expired token');
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    console.log(`Password reset successful: email=${user.email}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(`Error in reset-password route: ${error.message}`);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;