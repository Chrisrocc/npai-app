const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto  = require('crypto');
const User    = require('../models/Users');

/* ----------------------------------------------------
   Helper: quickly build a transporter for all e-mails
---------------------------------------------------- */
function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/* ----------------------------------------------------
   1. TEST
---------------------------------------------------- */
router.get('/test', (req, res) => {
  console.log('Auth test route accessed');
  res.send('Auth routes working');
});

/* ----------------------------------------------------
   2. CURRENT USER
---------------------------------------------------- */
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

/* ----------------------------------------------------
   3. SIGN-UP
---------------------------------------------------- */
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
    const user = new User({
      name,
      email,
      password,
      verificationToken,
      isApproved: false,
    });
    await user.save();
    console.log(`User created: email=${email}, verificationToken=${verificationToken}`);

    const transporter = buildTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      text: `Please verify your email by clicking this link: ${
        process.env.FRONTEND_URL || 'http://localhost:3000'
      }/verify/${verificationToken}`,
    };
    console.log('Sending verification email:', mailOptions.text);

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to: ${email}`);
    res
      .status(201)
      .json({
        message:
          'User created. Please check your email to verify your account. An admin will need to approve your account before you can log in.',
      });
  } catch (error) {
    console.error(`Error in signup route: ${error.message}`);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

/* ----------------------------------------------------
   4. VERIFY E-MAIL
---------------------------------------------------- */
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

/* ----------------------------------------------------
   5. LOGIN  (→ debug lines added here)
---------------------------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    /* 🔍  NEW DEBUG STATEMENTS  */
    console.log('RAW password from request:', JSON.stringify(password));
    console.log('Length of password string:', password.length);
    /* ------------------------- */

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

    console.log(
      `User found: email=${email}, isVerified=${user.isVerified}, isApproved=${user.isApproved}`,
    );

    if (!user.isVerified) {
      console.log(`Login failed: Email not verified: ${email}`);
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    if (!user.isApproved) {
      console.log(`Login failed: Account not approved: ${email}`);
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }

    const isMatch = await user.comparePassword(password);

    /* 🔍  NEW DEBUG STATEMENT  */
    console.log('Result of comparePassword →', isMatch);
    /* ------------------------- */

    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3_600_000, // 1 h
    });

    console.log(`Login successful: email=${email}, token=${token}`);
    res.json({ message: 'Login successful', user: { id: user._id, email: user.email }, token });
  } catch (error) {
    console.error(`Error in login route: ${error.message}`);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

/* ----------------------------------------------------
   6. LOGOUT
---------------------------------------------------- */
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

/* ----------------------------------------------------
   7. ADMIN: PENDING / APPROVE / REJECT
---------------------------------------------------- */
// … (unchanged code for /users/pending, /approve/:id, /reject/:id)
///  (you can leave the existing implementations as-is)

/* ----------------------------------------------------
   8. PASSWORD RESET
---------------------------------------------------- */
// … (unchanged code for /forgot-password and /reset-password/:token)

/* ----------------------------------------------------
   EXPORT
---------------------------------------------------- */
module.exports = router;
