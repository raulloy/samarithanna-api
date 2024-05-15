import jwt from 'jsonwebtoken';
import mg from 'mailgun-js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'Invalid Token' });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: 'No Token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).send({ message: 'Invalid Admin Token' });
  }
};

export const mailgun = () =>
  mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });

export const orderProcessedEmailTemplate = (order) => {
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Gracias por tu compra!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido ha sido procesado.</p>
      <h2 style="color: #444;">Pedido ${order._id}</h2>
      <table style="margin: auto; width: 80%; border-collapse: collapse; border: 1px solid #ccc;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Producto</strong></th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Cantidad</strong></th>
            <th style="text-align: right; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Precio</strong></th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${
                item.name
              }</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${
                item.quantity
              }</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.price.toFixed(
                2
              )}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${order.subtotal.toFixed(
              2
            )}</strong></td>
          </tr>
          <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"></td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>IEPS:</strong></td>
          <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
            order.ieps
          }</strong></td>
        </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${order.totalPrice.toFixed(
              2
            )}</strong></td>
          </tr>
        </tfoot>
      </table>
      <h2 style="color: #444;">Dirección de envío</h2>
      <p>
        ${order.shippingAddress.fullName},<br/>
        ${order.shippingAddress.address},<br/><br/>
      <p>¡Gracias por tu preferencia!.</p>
      <hr style="border: 1px solid #f2f2f2; width: 80%;">
    </div>
    `;
};

export const estimatedDeliveryEmailTemplate = (order) => {
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Tu pedido está siendo preparado!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido está siendo preparado y se entregará el ${order.estimatedDelivery.toLocaleDateString(
        'es-MX',
        {
          timeZone: 'UTC',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      )}.</p>
      <h2 style="color: #444;">Pedido ${order._id}</h2>
      <table style="margin: auto; width: 80%; border-collapse: collapse; border: 1px solid #ccc;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Producto</strong></th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Cantidad</strong></th>
            <th style="text-align: right; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Precio</strong></th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.price}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.subtotal
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>IEPS:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.ieps
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.totalPrice
            }</strong></td>
          </tr>
        </tfoot>
      </table>
      <h2 style="color: #444;">Dirección de envío</h2>
      <p>
        ${order.shippingAddress.fullName},<br/>
        ${order.shippingAddress.address},<br/><br/>
      <p>¡Gracias por tu preferencia!.</p>
      <hr style="border: 1px solid #f2f2f2; width: 80%;">
    </div>
    `;
};

export const orderIsReadyEmailTemplate = (order) => {
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Tu pedido está listo!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido está listo y va en camino.</p>
      <h2 style="color: #444;">Pedido ${order._id}</h2>
      <table style="margin: auto; width: 80%; border-collapse: collapse; border: 1px solid #ccc;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Producto</strong></th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Cantidad</strong></th>
            <th style="text-align: right; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Precio</strong></th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${
                item.name
              }</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${
                item.quantity
              }</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.price.toFixed(
                2
              )}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.subtotal
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>IEPS:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.ieps
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.totalPrice
            }</strong></td>
          </tr>
        </tfoot>
      </table>
      <h2 style="color: #444;">Dirección de envío</h2>
      <p>
        ${order.shippingAddress.fullName},<br/>
        ${order.shippingAddress.address},<br/><br/>
      <p>¡Gracias por tu preferencia!.</p>
      <hr style="border: 1px solid #f2f2f2; width: 80%;">
    </div>
    `;
};

export const orderDeliveredEmailTemplate = (order) => {
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Tu pedido ha sido entregado!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido ha sido entregado.</p>
      <h2 style="color: #444;">Pedido ${order._id}</h2>
      <table style="margin: auto; width: 80%; border-collapse: collapse; border: 1px solid #ccc;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Producto</strong></th>
            <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Cantidad</strong></th>
            <th style="text-align: right; border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Precio</strong></th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${item.price}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.subtotal
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>IEPS:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.ieps
            }</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"></td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Total:</strong></td>
            <td style="text-align: right; border: 1px solid #ddd; padding: 8px;"><strong>$${
              order.totalPrice
            }</strong></td>
          </tr>
        </tfoot>
      </table>
      <h2 style="color: #444;">Dirección de envío</h2>
      <p>
        ${order.shippingAddress.fullName},<br/>
        ${order.shippingAddress.address},<br/><br/>
      <p>¡Gracias por tu preferencia!.</p>
      <hr style="border: 1px solid #f2f2f2; width: 80%;">
    </div>
    `;
};
