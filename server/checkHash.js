// checkHash.js  (save this in the same folder as index.js)
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

// adjust the path ONLY if your models folder is elsewhere
const User = require('./models/Users');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/npaiDB');

    const users = await User.find({ email: 'croccuzzo5@gmail.com' });
    console.log(`Found ${users.length} user(s) with that email:\n`);

    for (const u of users) {
      const ok = await bcrypt.compare('12345', u.password);
      console.log(`_id: ${u._id}`);
      console.log(`storedHash matches "12345"? → ${ok}`);
      console.log(`storedHash: ${u.password}\n`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
