import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import moment from 'moment';
import {
  isAuth,
  isAdmin,
  orderProcessedEmailTemplate,
  mailgun,
  estimatedDeliveryEmailTemplate,
  orderIsReadyEmailTemplate,
  orderDeliveredEmailTemplate,
} from '../utils.js';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.send(orders);
  })
);

orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const newOrder = new Order({
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      returnItems: req.body.returnItems.map((x) => ({ ...x, product: x._id })),
      purchaseOrder: req.body.purchaseOrder,
      shippingAddress: req.body.shippingAddress,
      subtotal: req.body.subtotal,
      ieps: req.body.ieps,
      totalPrice: req.body.totalPrice,
      user: req.user._id,
    });

    const order = await newOrder.save();
    res.status(201).send({ message: 'New Order Created', order });
  })
);

orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);
    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const monthlyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          numMonthlyOrders: { $sum: 1 },
          monthlySales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const productCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);
    const itemsSoldByProduct = await Order.aggregate([
      {
        $unwind: '$orderItems',
      },
      {
        $group: {
          _id: '$orderItems.product',
          totalQuantity: { $sum: '$orderItems.quantity' },
        },
      },
      {
        $lookup: {
          from: 'products', // Adjust this if your products collection is named differently
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $unwind: '$productDetails', // Optional: Flattens the productDetails if you expect one product per ID
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$productDetails.name',
          totalQuantity: 1,
        },
      },
      {
        $sort: { totalQuantity: -1 }, // Sorts documents by totalQuantity in ascending order
      },
    ]);
    res.send({
      users,
      orders,
      dailyOrders,
      monthlyOrders,
      productCategories,
      itemsSoldByProduct,
    });
  })
);

orderRouter.get(
  '/mine/stats',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const today = moment().startOf('day');
    const startOfMonth = moment().startOf('month');

    const todayOrders = await Order.find({
      user: req.user._id,
      createdAt: { $gte: today.toDate() },
    }).sort({ createdAt: -1 });

    const monthOrders = await Order.find({
      user: req.user._id,
      createdAt: { $gte: startOfMonth.toDate() },
    }).sort({ createdAt: -1 });

    res.send({
      todayOrdersCount: todayOrders.length,
      monthOrdersCount: monthOrders.length,
    });
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.send(orders);
  })
);

orderRouter.get(
  '/mine/recent-orders',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.send(orders);
  })
);

orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/order-processed',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.orderEmailSent = true;

      const updatedOrder = await order.save();
      mailgun()
        .messages()
        .send(
          {
            from: 'Samarit-Hanna <hola@samarithanna.com>',
            to: `${order.user.name} <${order.user.email}>`,
            subject: `Tu pedido ha sido recibido`,
            // subject: `New order ${order._id}`,
            html: orderProcessedEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: 'Order Processed', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/estimatedDelivery',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.estimatedDelivery = req.body.estimatedDelivery;

      const updatedOrder = await order.save();
      mailgun()
        .messages()
        .send(
          {
            from: 'Samarit-Hanna <hola@samarithanna.com>',
            to: `${order.user.name} <${order.user.email}>`,
            subject: `Fecha de entrega de tu pedido`,
            html: estimatedDeliveryEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: 'Order delivery scheduled', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/ready',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.isReady = true;
      order.readyAt = Date.now();

      const updatedOrder = await order.save();
      mailgun()
        .messages()
        .send(
          {
            from: 'Samarit-Hanna <hola@samarithanna.com>',
            to: `${order.user.name} <${order.user.email}>`,
            subject: `Tu pedido va en camino`,
            // subject: `New order ${order._id}`,
            html: orderIsReadyEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: 'Order Ready', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.deliveredAt = Date.now();
      order.isDelivered = true;

      const updatedOrder = await order.save();
      mailgun()
        .messages()
        .send(
          {
            from: 'Samarit-Hanna <hola@samarithanna.com>',
            to: `${order.user.name} <${order.user.email}>`,
            subject: `Tu pedido ha sido entregado`,
            html: orderDeliveredEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: 'Order Delivered', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;
