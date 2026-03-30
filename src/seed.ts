import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/orderflow';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  stock: Number,
  active: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Admin
  const existing = await User.findOne({ email: 'admin@orderflow.com' });
  if (!existing) {
    await User.create({
      name: 'Admin',
      email: 'admin@orderflow.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    });
    console.log('✔ Admin created — admin@orderflow.com / admin123');
  } else {
    console.log('· Admin already exists, skipping');
  }

  // Products
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: 'Camiseta Preta M', description: 'Camiseta 100% algodão, tamanho M', price: 49.9, stock: 50 },
      { name: 'Tênis Casual Branco', description: 'Tênis confortável para o dia a dia', price: 189.9, stock: 20 },
      { name: 'Mochila Notebook 15"', description: 'Compartimento acolchoado para notebook até 15"', price: 149.9, stock: 15 },
      { name: 'Boné Aba Curva', description: 'Boné ajustável, diversos tamanhos', price: 39.9, stock: 100 },
      { name: 'Meias Kit com 6', description: 'Kit com 6 pares de meias cano curto', price: 29.9, stock: 200 },
    ]);
    console.log('✔ 5 products created');
  } else {
    console.log('· Products already exist, skipping');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => { console.error(err); process.exit(1); });
