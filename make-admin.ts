import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://growwithtrade04_db_user:Growwithtrade2026@growwithtrade.rftrxsq.mongodb.net/trading-demo?appName=Growwithtrade';

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function makeAdmin(identifier: string) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
    if (!user) {
      console.log(`User not found: ${identifier}`);
      return;
    }

    if (user.isAdmin) {
      console.log(`User ${identifier} is already an admin.`);
    } else {
      user.isAdmin = true;
      await user.save();
      console.log(`SUCCESS: User ${identifier} is now an admin!`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Pass the username or email as an argument
const identifier = process.argv[2];
if (!identifier) {
  console.log('Please provide a username or email: npx tsx make-admin.ts <username_or_email>');
  process.exit(1);
}

makeAdmin(identifier);
