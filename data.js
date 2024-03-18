import bcrypt from 'bcryptjs';

const data = {
  users: [
    {
      name: 'Raul',
      email: 'raul.loy@gmail.com',
      password: bcrypt.hashSync('1995TkdPk'),
      isAdmin: true,
    },
    {
      name: 'User',
      email: 'user@example.com',
      password: bcrypt.hashSync('123456'),
      isAdmin: false,
    },
  ],
  products: [
    {
      // _id: '1',
      name: 'Pan Árabe',
      slug: 'pan-arabe',
      category: 'Pan',
      image: '/images/Pan Árabe.jpg',
      price: 120,
      countInStock: 10,
      brand: 'Samarit Hanna',
      rating: 4.5,
      numReviews: 10,
      description:
        'Pan elaborado a base de harina de trigo, levadura, azúcar y sal; perfecto para acompañarlo con ingredientes dulces o salados, incluso con tu comida del día, o bien hacer delicioso pan con queso, como pizza o una crepa dulce o salda.',
    },
    {
      // _id: '2',
      name: 'Jocoque Seco',
      slug: 'jocoque-seco',
      category: 'Jocoque',
      image: '/images/Jocoque Seco.jpg',
      price: 250,
      countInStock: 20,
      brand: 'Samarit Hanna',
      rating: 4.0,
      numReviews: 10,
      description:
        'El jocoque o jocoqui es un producto tradicional preparado a base de leche fermentada que es excelente para acompañar diversos platillos de la gastronomía mexicana; no importa si son salados o dulces, el jocoque va con todo.',
    },
    {
      name: 'Rosquillas con Ajonjolí y Anís',
      slug: 'rosquillas-ajonjoli',
      category: 'Pan',
      image: '/images/Rosquillas con Ajonjolí y Anís.jpg',
      price: 25,
      countInStock: 15,
      brand: 'Samarit Hanna',
      rating: 4.5,
      numReviews: 14,
      description:
        'Galleta en forma de rosca, elaborada con harina de trigo y anís como parte esencial, espolvoreado con ajonjolí tostado, perfecta para una botana con jocoque.',
    },
    {
      name: 'Arracadas de Ajonjolí',
      slug: 'arracadas-ajonjoli',
      category: 'Pan',
      image: '/images/Arracadas de Ajonjolí.jpg',
      price: 65,
      countInStock: 5,
      brand: 'Samarit Hanna',
      rating: 4.5,
      numReviews: 10,
      description:
        'Galleta salada elaborada con harina de trigo, cubierta con ajonjolí tostado perfecta para una botana con jocoque, humus o tabule o bien sola para disfrutarla.',
    },
    {
      name: 'Dedos de Novia',
      slug: 'dedos-de-novia',
      category: 'Pan',
      image: '/images/Dedos de Novia.jpg',
      price: 65,
      countInStock: 5,
      brand: 'Samarit Hanna',
      rating: 4.5,
      numReviews: 10,
      description:
        'El dedo de novia está relleno de nuez y bañado en una miel especial para los dulces árabes . Es crujiente por fuera y la miel lo hidrata por dentro, así que cuando comes dedos de novia tienes una doble sensación, lo percibes crujiente y suave a la vez.',
    },
    {
      name: 'Pastel de Dátil con Nuez',
      slug: 'pastel-de-datil',
      category: 'Pan',
      image: '/images/Pastel de Dátil con Nuez.jpg',
      price: 65,
      countInStock: 5,
      brand: 'Samarit Hanna',
      rating: 4.5,
      numReviews: 10,
      description:
        'El Pastel de Dátil con Nuez es un delicioso pay elaborado con nueces y dátiles, ideal para compartir en una merienda con amigos o cualquier evento especial.',
    },
  ],
};
export default data;
