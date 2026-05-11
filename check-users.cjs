
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const checkUsers = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      username: String
    }));
    
    const users = await User.find({}, 'email username');
    console.log('--- Current Users in Database ---');
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      users.forEach(u => console.log(`Email: ${u.email}, Username: ${u.username}`));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

checkUsers();
