import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // `select: false` keeps the hash out of every query unless explicitly requested.
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
