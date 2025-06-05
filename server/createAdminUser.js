const mongoose = require('mongoose');
const User = require('./models/Users'); // Updated to Users.js (plural)

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/npaiDB', { // Replace with your MongoDB URI if different
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Create the admin user
const createAdminUser = async () => {
  try {
    const existingUser = await User.findOne({ email: 'croccuzzo5@gmail.com' });
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return;
    }

    const adminUser = new User({
      name: 'Christian',
      email: 'croccuzzo5@gmail.com',
      password: '12345',
      isVerified: true,
      verificationToken: null,
      isApproved: true,
      isAdmin: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date('2025-05-30T08:28:00.000Z'),
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminUser.email);
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
createAdminUser();