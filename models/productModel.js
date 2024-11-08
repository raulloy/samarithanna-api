import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    productQty: { type: String, required: true },
    presentation: { type: String, required: true },
    exclusive: { type: Boolean, default: false },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    description: { type: String, required: true },
    ieps: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
