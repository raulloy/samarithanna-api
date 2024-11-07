import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import moment from 'moment-timezone';
import {
  isAuth,
  isAdmin,
  orderProcessedEmailTemplate,
  estimatedDeliveryEmailTemplate,
  orderIsReadyEmailTemplate,
  orderDeliveredEmailTemplate,
  isAdminOrDelivery,
  orderProcessedAdmin,
} from '../utils.js';
import { sendEmail } from '../mailer.js';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  // isAdmin,
  isAdminOrDelivery,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find().populate('user', 'name').sort({ createdAt: -1 });
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

function getWeekDay(dateString) {
  const date = moment.tz(dateString, 'America/Mexico_City');
  const weekDay = date.format('dddd');
  return weekDay;
}

orderRouter.get(
  '/users-daily-tracking',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const startOfWeek = moment().tz('America/Mexico_City').startOf('isoWeek').toDate();
    const endOfWeek = moment().tz('America/Mexico_City').endOf('isoWeek').toDate();

    // console.log('Start of week:', startOfWeek);
    // console.log('End of week:', endOfWeek);

    const dailyUserOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $project: {
          user: 1,
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'America/Mexico_City',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            user: '$user',
            day: '$day',
          },
          ordersCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $group: {
          _id: '$_id.user',
          userName: { $first: '$userDetails.name' },
          minOrders: { $first: '$userDetails.minOrders' },
          dailyOrders: {
            $push: {
              day: '$_id.day',
              ordersCount: '$ordersCount',
            },
          },
          totalOrders: { $sum: '$ordersCount' },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: 1,
          minOrders: 1,
          dailyOrders: 1,
          totalOrders: 1,
        },
      },
      {
        $sort: { userName: 1 },
      },
    ]);

    // console.log('Daily User Orders:', dailyUserOrders);

    const users = await User.find({ daysFrequency: 7 }, 'name minOrders');

    const usersTracking = users.reduce((acc, user) => {
      acc[user._id.toString()] = {
        userName: user.name,
        minOrders: user.minOrders || 0,
        orders: {
          Monday: 0,
          Tuesday: 0,
          Wednesday: 0,
          Thursday: 0,
          Friday: 0,
          Saturday: 0,
          Sunday: 0,
        },
        totalOrders: 0,
      };
      return acc;
    }, {});

    dailyUserOrders.forEach((current) => {
      const { userId, dailyOrders, totalOrders } = current;
      if (usersTracking[userId.toString()]) {
        dailyOrders.forEach(({ day, ordersCount }) => {
          const weekDay = getWeekDay(day); // Convertir la fecha en nombre del día de la semana
          usersTracking[userId.toString()].orders[weekDay] += ordersCount; // Usar += para acumular los pedidos
        });
        usersTracking[userId.toString()].totalOrders = totalOrders;
      } else {
        console.warn(`User ID ${userId} not found in usersTracking`);
      }
    });

    // console.log('Users Tracking:', usersTracking);

    res.send(Object.values(usersTracking));
  })
);

const getUsersDailyTracking = async (startDate, endDate) => {
  const dailyUserOrders = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          user: '$user',
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'America/Mexico_City',
            },
          },
        },
        ordersCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.user',
        foreignField: '_id',
        as: 'userDetails',
      },
    },
    {
      $unwind: '$userDetails',
    },
    {
      $group: {
        _id: '$_id.user',
        userName: { $first: '$userDetails.name' },
        minOrders: { $first: '$userDetails.minOrders' },
        dailyOrders: {
          $push: {
            day: '$_id.day',
            ordersCount: '$ordersCount',
          },
        },
        totalOrders: { $sum: '$ordersCount' },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        userName: 1,
        minOrders: 1,
        dailyOrders: 1,
        totalOrders: 1,
      },
    },
    {
      $sort: { userName: 1 }, // Ordena por nombre de usuario
    },
  ]);

  return dailyUserOrders;
};

orderRouter.get(
  '/users-daily-tracking-2',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const startOfCurrentWeek = moment().startOf('isoWeek').add(1, 'day').toDate();
    const endOfCurrentWeek = moment().endOf('isoWeek').add(1, 'day').toDate();
    const startOfLastWeek = moment().subtract(1, 'weeks').startOf('isoWeek').toDate();
    const endOfLastWeek = moment().subtract(1, 'weeks').endOf('isoWeek').toDate();

    // console.log('Start of current week:', startOfCurrentWeek);
    // console.log('End of current week:', endOfCurrentWeek);
    // console.log('Start of last week:', startOfLastWeek);
    // console.log('End of last week:', endOfLastWeek);

    const users = await User.find({ daysFrequency: 14 }, 'name minOrders');

    const currentWeekOrders = await getUsersDailyTracking(startOfCurrentWeek, endOfCurrentWeek);
    const lastWeekOrders = await getUsersDailyTracking(startOfLastWeek, endOfLastWeek);

    // Inicializar el objeto de seguimiento de usuarios con todos los usuarios para ambas semanas
    const usersTracking = users.reduce((acc, user) => {
      acc[user._id.toString()] = {
        userName: user.name,
        minOrders: user.minOrders || 0,
        currentWeek: {
          orders: {
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: 0,
            Sunday: 0,
          },
          totalOrders: 0,
        },
        lastWeek: {
          orders: {
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: 0,
            Sunday: 0,
          },
          totalOrders: 0,
        },
      };
      return acc;
    }, {});

    // console.log('Users Tracking Initialized:', Object.keys(usersTracking));

    // Actualizar el objeto de seguimiento con los pedidos de la semana actual
    currentWeekOrders.forEach((current) => {
      const { userId, dailyOrders, totalOrders } = current;
      if (usersTracking[userId.toString()]) {
        dailyOrders.forEach(({ day, ordersCount }) => {
          const weekDay = getWeekDay(day); // Convertir la fecha en nombre del día de la semana
          usersTracking[userId.toString()].currentWeek.orders[weekDay] = ordersCount;
        });
        usersTracking[userId.toString()].currentWeek.totalOrders = totalOrders;
      }
    });

    // Actualizar el objeto de seguimiento con los pedidos de la semana pasada
    lastWeekOrders.forEach((current) => {
      const { userId, dailyOrders, totalOrders } = current;
      if (usersTracking[userId.toString()]) {
        dailyOrders.forEach(({ day, ordersCount }) => {
          const weekDay = getWeekDay(day); // Convertir la fecha en nombre del día de la semana
          usersTracking[userId.toString()].lastWeek.orders[weekDay] = ordersCount;
        });
        usersTracking[userId.toString()].lastWeek.totalOrders = totalOrders;
      }
    });

    // console.log(Object.values(usersTracking));

    res.send(Object.values(usersTracking));
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
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
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
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
      order.orderEmailSent = true;

      const updatedOrder = await order.save();

      // Sending New Order email
      const orderProcessedAdminHtml = orderProcessedAdmin(order);
      sendEmail(['raul.loy@gmail.com'], order.user.name, `Nuevo Pedido de ${order.user.name}`, orderProcessedAdminHtml);

      // Sending Order Processed email
      const orderProcessedHtml = orderProcessedEmailTemplate(order);
      sendEmail([order.user.email], order.user.name, 'Tu pedido ha sido recibido', orderProcessedHtml);

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
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
      order.estimatedDelivery = req.body.estimatedDelivery;

      const updatedOrder = await order.save();

      // Sending Estimated Delivery email
      const estimatedDeliveryHtml = estimatedDeliveryEmailTemplate(order);
      sendEmail([order.user.email], order.user.name, 'Tu pedido está siendo preparado', estimatedDeliveryHtml);

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
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
      order.isReady = true;
      order.readyAt = Date.now();

      const updatedOrder = await order.save();

      // Sending Order Is Ready email
      const orderIsReadyHtml = orderIsReadyEmailTemplate(order);
      sendEmail([order.user.email], order.user.name, 'Tu pedido va en camino', orderIsReadyHtml);

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
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
      order.deliveredAt = Date.now();
      order.isDelivered = true;

      const updatedOrder = await order.save();

      // Sending Order Delivered email
      const orderDeliveredHtml = orderDeliveredEmailTemplate(order);
      sendEmail([order.user.email], order.user.name, 'Tu pedido ha sido entregado', orderDeliveredHtml);

      res.send({ message: 'Order Delivered', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;

// orderRouter.get(
//   '/users-daily-tracking',
//   isAuth,
//   isAdmin,
//   expressAsyncHandler(async (req, res) => {
//     const startOfWeek = moment().startOf('isoWeek');
//     const endOfWeek = moment().endOf('isoWeek');

//     const dailyUserOrders = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: startOfWeek.toDate(), $lte: endOfWeek.toDate() },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             user: '$user',
//             day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
//           },
//           ordersCount: { $sum: 1 },
//         },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: '_id.user',
//           foreignField: '_id',
//           as: 'userDetails',
//         },
//       },
//       {
//         $unwind: '$userDetails',
//       },
//       {
//         $project: {
//           _id: 0,
//           userId: '$_id.user',
//           day: '$_id.day',
//           userName: '$userDetails.name',
//           ordersCount: 1,
//         },
//       },
//       {
//         $sort: { day: 1, userName: 1 }, // Ordena por día y luego por nombre de usuario
//       },
//     ]);

//     res.send(dailyUserOrders);
//   })
// );
