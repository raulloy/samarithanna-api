import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import {
  isAuth,
  isAdmin,
  mailgun,
  payOrderEmailTemplate,
  orderIsReadyEmailTemplate,
  estimatedDeliveryEmailTemplate,
  orderDeliveredEmailTemplate,
} from '../utils.js';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find().populate('user', 'name');
    res.send(orders);
  })
);

orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const newOrder = new Order({
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      shippingPrice: req.body.shippingPrice,
      taxPrice: req.body.taxPrice,
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
    const productCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);
    res.send({ users, orders, dailyOrders, productCategories });
  })
);

orderRouter.get(
  '/orders-tracking',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Calculate last week
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek - 7);

    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);

    // Calculate 2 weeks ago
    const lastSunday_2 = new Date(today);
    lastSunday_2.setDate(today.getDate() - dayOfWeek - 14);

    const lastSaturday_2 = new Date(lastSunday_2);
    lastSaturday_2.setDate(lastSunday_2.getDate() + 13);

    const ordersLastWeekByUser = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastSunday, $lte: lastSaturday },
        },
      },
      {
        $group: {
          _id: '$user',
          numberOfOrders: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          _id: 0,
          user_email: '$userDetails.email',
          daysFrequency: '$userDetails.daysFrequency',
          avgOrders: '$userDetails.avgOrders',
          number_of_orders_last_week: '$numberOfOrders',
        },
      },
    ]);

    const ordersLast_2_WeeksByUser = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: lastSunday_2, $lte: lastSaturday_2 },
        },
      },
      {
        $group: {
          _id: '$user',
          numberOfOrders: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          _id: 0,
          user_email: '$userDetails.email',
          daysFrequency: '$userDetails.daysFrequency',
          avgOrders: '$userDetails.avgOrders',
          number_of_orders_last_week: '$numberOfOrders',
        },
      },
    ]);

    res.send({ ordersLastWeekByUser, ordersLast_2_WeeksByUser });
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
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
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const order = await Order.findById(orderID).populate('user', 'name');
    if (order) {
      order.estimatedDelivery = req.body.estimatedDelivery;
      await order.save();
      res.send({ message: 'Order Updated' });
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
            // subject: `New order ${order._id}`,
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

      res.send({ message: 'Order Paid', order: updatedOrder });
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
  // expressAsyncHandler(async (req, res) => {
  //   const order = await Order.findById(req.params.id);
  //   if (order) {
  //     order.isReady = true;
  //     order.readyAt = Date.now();
  //     await order.save();
  //     res.send({ message: 'Order Delivered' });
  //   } else {
  //     res.status(404).send({ message: 'Order Not Found' });
  //   }
  // })
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
      order.isDelivered = true;
      order.deliveredAt = Date.now();

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

orderRouter.put(
  '/:id/order-processed',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      // order.isPaid = false;
      // order.paidAt = Date.now();
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
            html: payOrderEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: 'Order Paid', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.remove();
      res.send({ message: 'Order Deleted' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;
