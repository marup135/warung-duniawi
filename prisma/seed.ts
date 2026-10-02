import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Warung Duniawi catalog with Barcodes...');

  // 1. Bersihkan data lama
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // 2. Kategori Utama
  const categories = [
    { name: 'Sembako & Dapur', slug: 'sembako', icon: '🌾', sortOrder: 1 },
    { name: 'Rokok & Tembakau', slug: 'rokok', icon: '🚬', sortOrder: 2 },
    { name: 'Es Krim & Dingin', slug: 'eskrim', icon: '🍦', sortOrder: 3 },
    { name: 'Roti & Snack', slug: 'makanan', icon: '🍞', sortOrder: 4 },
    { name: 'Minuman Segar', slug: 'minuman', icon: '🥤', sortOrder: 5 },
    { name: 'Sabun & Kebutuhan Rumah', slug: 'kebersihan', icon: '🧼', sortOrder: 6 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const created = await prisma.category.create({
      data: cat,
    });
    createdCategories[cat.slug] = created.id;
  }

  // 3. Produk-Produk Warung Nyata dengan Kode Barcode
  const products = [
    // Sembako & Dapur Utama
    {
      name: 'Minyak Goreng SunCo 2 Liter',
      slug: 'minyak-sunco-2l',
      barcode: '899100100002',
      description: 'Minyak goreng bening kelapa sawit berkualitas, tidak cepat hitam.',
      price: 38000,
      unit: 'pouch (2L)',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['sembako'],
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Telur Ayam Negeri Segar 1 Kg',
      slug: 'telur-ayam-1kg',
      barcode: '899100100003',
      description: 'Telur ayam segar langsung dari peternakan, isi sekitar 15-16 butir.',
      price: 28500,
      unit: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['sembako'],
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Gula Pasir Gulaku Kuning 1 Kg',
      slug: 'gulaku-kuning-1kg',
      barcode: '899100100004',
      description: 'Gula tebu murni dengan aroma karamel khas dan manis pas.',
      price: 18500,
      unit: 'kg',
      imageUrl: 'https://images.unsplash.com/photo-1622484212850-cab596d63c5a?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['sembako'],
      isFeatured: false,
      inStock: true,
    },
    {
      name: 'Indomie Goreng Spesial',
      slug: 'indomie-goreng-spesial',
      barcode: '089686043014',
      description: 'Mi instan goreng legendaris dengan bumbu gurih nikmat dan bawang goreng renyah.',
      price: 3500,
      unit: 'bungkus',
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['sembako'],
      isFeatured: true,
      inStock: true,
    },

    // Rokok
    {
      name: 'Sampoerna A Mild 16',
      slug: 'sampoerna-a-mild-16',
      barcode: '899999900001',
      description: 'Rokok kretek filter rendah tar dan nikotin pilihan perokok dewasa.',
      price: 36000,
      unit: 'bungkus',
      imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['rokok'],
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Gudang Garam Surya 16',
      slug: 'surya-16',
      barcode: '899999900002',
      description: 'Rokok kretek filter dengan rasa mantap dan racikan tembakau khas Kediri.',
      price: 35000,
      unit: 'bungkus',
      imageUrl: 'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['rokok'],
      isFeatured: false,
      inStock: true,
    },
    {
      name: 'Djarum Super 12',
      slug: 'djarum-super-12',
      barcode: '899999900003',
      description: 'Kretek rasa khas nusantara tembakau cengkeh pilihan.',
      price: 24000,
      unit: 'bungkus',
      imageUrl: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['rokok'],
      isFeatured: false,
      inStock: true,
    },

    // Es Krim
    {
      name: 'Aice Jagung Manis (Sweet Corn)',
      slug: 'aice-sweet-corn',
      barcode: '899720000001',
      description: 'Es krim stik rasa jagung manis lezat dengan aroma khas dan cone renyah lembut.',
      price: 4000,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['eskrim'],
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Aice Mochi Durian',
      slug: 'aice-mochi-durian',
      barcode: '899720000002',
      description: 'Kulit mochi kenyal dengan isian es krim rasa durian asli yang lumer di mulut.',
      price: 3500,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['eskrim'],
      isFeatured: false,
      inStock: true,
    },
    {
      name: 'Walls Cornetto Chocolate Disc',
      slug: 'walls-cornetto-disc',
      barcode: '899720000003',
      description: 'Cone renyah berlapis cokelat tebal dengan topping keping coklat lezat.',
      price: 12000,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['eskrim'],
      isFeatured: true,
      inStock: true,
    },

    // Roti & Makanan
    {
      name: 'Sari Roti Tawar Spesial 370g',
      slug: 'sari-roti-tawar-spesial',
      barcode: '899888800001',
      description: 'Roti tawar lembut dan empuk tanpa kulit keras, pas untuk sarapan keluarga.',
      price: 16000,
      unit: 'bungkus',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['makanan'],
      isFeatured: true,
      inStock: true,
    },
    {
      name: 'Sari Roti Sandwich Coklat',
      slug: 'sari-roti-sandwich-coklat',
      barcode: '899888800002',
      description: 'Roti lapis praktis siap santap dengan selai cokelat melimpah.',
      price: 6000,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['makanan'],
      isFeatured: false,
      inStock: true,
    },

    // Minuman Segar
    {
      name: 'Le Minerale 600ml Dingin',
      slug: 'le-minerale-600ml',
      barcode: '899600100001',
      description: 'Air mineral pegunungan segar dengan mineral alami dan manis khas.',
      price: 3500,
      unit: 'botol',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['minuman'],
      isFeatured: false,
      inStock: true,
    },
    {
      name: 'Teh Pucuk Harum 350ml Dingin',
      slug: 'teh-pucuk-350ml',
      barcode: '899600100002',
      description: 'Minuman teh melati dari pucuk daun teh pilihan, disajikan segar dingin.',
      price: 4000,
      unit: 'botol',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['minuman'],
      isFeatured: true,
      inStock: true,
    },

    // Sabun & Kebersihan
    {
      name: 'Sunlight Jeruk Nipis 700ml',
      slug: 'sunlight-700ml',
      barcode: '899500100001',
      description: 'Sabun cuci piring konsentrat ekstrak jeruk nipis asli, bersihkan lemak membandel.',
      price: 15500,
      unit: 'pouch',
      imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80',
      categoryId: createdCategories['kebersihan'],
      isFeatured: false,
      inStock: true,
    },
  ];

  for (const prod of products) {
    await prisma.product.create({
      data: prod,
    });
  }

  console.log(`Berhasil melakukan seed ${categories.length} kategori dan ${products.length} produk berkategori & barcode!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
