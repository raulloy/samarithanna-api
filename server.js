import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import seedRouter from './routes/seedRoutes.js';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to db');
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use('/api/seed', seedRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// // Get today's date
// const today = new Date('2024-03-28');

// const dayOfWeek = today.getDay();

// // Calculate last Sunday
// const lastSunday = new Date(today);
// lastSunday.setDate(today.getDate() - dayOfWeek - 14);

// // Calculate last Saturday by adding 6 days to last Sunday
// const lastSaturday = new Date(lastSunday);
// lastSaturday.setDate(lastSunday.getDate() + 13);

// // Format dates to YYYY-MM-DD (optional)
// const formatYYYYMMDD = (date) =>
//   date.toISOString().split('T')[0];

// // Logging the dates
// console.log(`Previous Sunday: ${formatYYYYMMDD(lastSunday)}`);
// console.log(`Previous Saturday: ${formatYYYYMMDD(lastSaturday)}`);
