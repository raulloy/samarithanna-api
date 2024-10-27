import jwt from 'jsonwebtoken';
import mg from 'mailgun-js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
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
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(401).send({ message: 'Invalid Admin Token' });
  }
};

export const isAdminOrDelivery = (req, res, next) => {
  if (
    req.user &&
    (req.user.userType === 'admin' || req.user.userType === 'delivery')
  ) {
    next();
  } else {
    res.status(401).send({ message: 'Access Denied' });
  }
};

export const mailgun = () =>
  mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });

export const welcomeEmailTemplate = (name) => {
  return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">
        <div style="text-align: center;">
          <h1 style="color: #333;">Hola ${name},</h1>
          <h2 style="color: #444;">¡Bienvenido a Samarithanna!</h2>
          <p style="font-size: 16px;">
            Nos alegra que te unas a nuestra comunidad.
          </p>
        </div>
  
        <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 16px;">
            Estamos aquí para ofrecerte una experiencia única de compra. Si tienes alguna pregunta o necesitas ayuda,
            no dudes en contactarnos.
          </p>
          <p style="font-size: 16px;">¡Gracias!</p>
        </div>
  
        <hr style="border: 1px solid #f2f2f2; width: 80%; margin: 20px auto;">
  
        <p style="font-size: 12px; color: #888; text-align: center;">
          Esta es una notificación automática. Por favor, no respondas a este correo. 
        </p>
      </div>
    `;
};

export const orderProcessedAdmin = (order) => {
  const orderId = order._id.toString();
  const orderIdLast5 = orderId.slice(-5);

  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">Nuevo pedido de ${order.user.name}</h1>
      <h2 style="color: #444;">Pedido S-${orderIdLast5}</h2>
      <div style="margin: 1rem">
        <a href="https://samarithanna.vercel.app/order/${
          order._id
        }" target="_blank" rel="noopener noreferrer">Ver pedido</a>
      </div>
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
      <hr style="border: 1px solid #f2f2f2; width: 80%;">
    </div>
    `;
};

export const orderProcessedEmailTemplate = (order) => {
  const orderId = order._id.toString();
  const orderIdLast5 = orderId.slice(-5);

  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Gracias por tu compra!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido ha sido procesado.</p>
      <h2 style="color: #444;">Pedido S-${orderIdLast5}</h2>
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
  const orderId = order._id.toString();
  const orderIdLast5 = orderId.slice(-5);
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
      <h2 style="color: #444;">Pedido S-${orderIdLast5}</h2>
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
  const orderId = order._id.toString();
  const orderIdLast5 = orderId.slice(-5);
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Tu pedido está listo!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido está listo y va en camino.</p>
      <h2 style="color: #444;">Pedido S-${orderIdLast5}</h2>
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
  const orderId = order._id.toString();
  const orderIdLast5 = orderId.slice(-5);
  return `
    <div style="text-align: center;">
      <h1 style="color: #333;">¡Tu pedido ha sido entregado!</h1>
      <p>Hola ${order.user.name},</p>
      <p>Tu pedido ha sido entregado.</p>
      <h2 style="color: #444;">Pedido S-${orderIdLast5}</h2>
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
