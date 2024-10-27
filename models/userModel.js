import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: {
      type: String,
      enum: ['admin', 'logistics', 'delivery', 'user'],
      required: true,
    },
    isAdmitted: { type: Boolean, default: false, required: true },
    daysFrequency: { type: Number },
    minOrders: { type: Number },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
