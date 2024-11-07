import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { isAuth, isAdmin, generateToken, welcomeEmailTemplate } from '../utils.js';
import { sendEmail } from '../mailer.js';

const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({});
    res.send(users);
  })
);

userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.userType = req.body.userType || user.userType;
      user.isAdmitted = req.body.isAdmitted ?? user.isAdmitted;
      user.exclusive = req.body.exclusive ?? user.exclusive;
      user.daysFrequency = req.body.daysFrequency;
      user.minOrders = req.body.minOrders;

      const updatedUser = await user.save();
      res.send({ message: 'User Updated', user: updatedUser });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        res.send({
          _id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          isAdmitted: user.isAdmitted,
          exclusive: user.exclusive,
          token: generateToken(user),
        });
        return;
      }
    }
    res.status(401).send({ message: 'Invalid email or password' });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password),
      userType: req.body.userType || 'user',
      isAdmitted: req.body.isAdmitted || false,
      exclusive: user.exclusive || false,
    });

    const user = await newUser.save();
    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      isAdmitted: user.isAdmitted,
      token: generateToken(user),
    });

    try {
      sendWelcomeEmail(user.name, user.email);
    } catch (error) {
      console.log(error);
    }
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser),
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

const sendWelcomeEmail = async (name, email) => {
  try {
    const welcomeEmailHtml = welcomeEmailTemplate(name);
    sendEmail(email, name, '¡Bienvenido a Samarithanna!', welcomeEmailHtml);

    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error(error);
  }
};

export default userRouter;
