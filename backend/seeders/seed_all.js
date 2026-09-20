const bcrypt = require('bcryptjs');
const { query, initRelationalDb } = require('../config/mysql_db');
const { initMongoDb, MongoAdapter } = require('../config/mongo_db');

async function seedDatabase() {
  console.log('--- Starting ChefHub High-End Visual Seeding ---');
  
  await initRelationalDb();
  await initMongoDb();

  const hashedAdminPassword = await bcrypt.hash('admin', 10);
  const hashedVendorPassword = await bcrypt.hash('vendor123', 10);
  const hashedCustomerPassword = await bcrypt.hash('customer123', 10);
  const hashedRiderPassword = await bcrypt.hash('rider123', 10);

  // 1. Seed Users
  const usersToSeed = [
    { name: 'Master Admin', email: 'admin', password: hashedAdminPassword, plain_password: 'admin', role: 'ADMIN', phone: '+1800-CHEFHUB' },
    { name: 'Chef Mario (Truffle & Pasta)', email: 'chef.mario@chefhub.com', password: hashedVendorPassword, plain_password: 'vendor123', role: 'VENDOR', phone: '+1555-0101' },
    { name: 'Chef Priya (Spice & Curry)', email: 'chef.priya@chefhub.com', password: hashedVendorPassword, plain_password: 'vendor123', role: 'VENDOR', phone: '+1555-0102' },
    { name: 'Chef Kenji (Tokyo Street Eats)', email: 'chef.kenji@chefhub.com', password: hashedVendorPassword, plain_password: 'vendor123', role: 'VENDOR', phone: '+1555-0103' },
    { name: 'Alex Customer', email: 'alex.customer@gmail.com', password: hashedCustomerPassword, plain_password: 'customer123', role: 'CUSTOMER', phone: '+1555-0201' },
    { name: 'Sarah Foodie', email: 'sarah.foodie@gmail.com', password: hashedCustomerPassword, plain_password: 'customer123', role: 'CUSTOMER', phone: '+1555-0202' },
    { name: 'David Rider', email: 'david.rider@chefhub.com', password: hashedRiderPassword, plain_password: 'rider123', role: 'RIDER', phone: '+1555-0301' },
    { name: 'Carlos Express', email: 'carlos.rider@chefhub.com', password: hashedRiderPassword, plain_password: 'rider123', role: 'RIDER', phone: '+1555-0302' }
  ];

  for (const u of usersToSeed) {
    const existing = await query('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)', [u.email]);
    if (existing.length === 0) {
      await query(
        "INSERT INTO users (name, email, password_hash, plain_password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')",
        [u.name, u.email, u.password, u.plain_password, u.role, u.phone]
      );
    } else {
      await query(
        'UPDATE users SET plain_password = ? WHERE user_id = ?',
        [u.plain_password, existing[0].user_id]
      );
    }
  }

  const allUsers = await query('SELECT user_id, name, email, role FROM users');
  const vendorMario = allUsers.find(u => u.email === 'chef.mario@chefhub.com');
  const vendorPriya = allUsers.find(u => u.email === 'chef.priya@chefhub.com');
  const vendorKenji = allUsers.find(u => u.email === 'chef.kenji@chefhub.com');
  const customerAlex = allUsers.find(u => u.email === 'alex.customer@gmail.com');
  const riderDavid = allUsers.find(u => u.email === 'david.rider@chefhub.com');

  // 2. Seed Relational Inventory in MySQL
  const inventoryItems = [
    { vendor_id: vendorMario.user_id, name: 'Truffle Oil', stock: 50.0, unit: 'liters', reorder: 5.0 },
    { vendor_id: vendorMario.user_id, name: 'Artisanal Pasta Flour', stock: 120.0, unit: 'kg', reorder: 15.0 },
    { vendor_id: vendorMario.user_id, name: 'Parmesan Cheese', stock: 35.0, unit: 'kg', reorder: 5.0 },
    { vendor_id: vendorMario.user_id, name: 'Fresh Burrata Cheese', stock: 25.0, unit: 'units', reorder: 5.0 },
    
    { vendor_id: vendorPriya.user_id, name: 'Basmati Rice', stock: 200.0, unit: 'kg', reorder: 25.0 },
    { vendor_id: vendorPriya.user_id, name: 'Garam Masala Blend', stock: 15.0, unit: 'kg', reorder: 2.0 },
    { vendor_id: vendorPriya.user_id, name: 'Organic Paneer', stock: 40.0, unit: 'kg', reorder: 8.0 },
    { vendor_id: vendorPriya.user_id, name: 'Boneless Chicken Breast', stock: 80.0, unit: 'kg', reorder: 12.0 },

    { vendor_id: vendorKenji.user_id, name: 'Ramen Egg Noodles', stock: 150.0, unit: 'units', reorder: 20.0 },
    { vendor_id: vendorKenji.user_id, name: 'Pork Tonkotsu Broth Base', stock: 60.0, unit: 'liters', reorder: 10.0 },
    { vendor_id: vendorKenji.user_id, name: 'Fresh Salmon Fillets', stock: 30.0, unit: 'kg', reorder: 5.0 }
  ];

  for (const inv of inventoryItems) {
    const existing = await query(
      'SELECT ingredient_id FROM inventory WHERE vendor_id = ? AND LOWER(ingredient_name) = LOWER(?)',
      [inv.vendor_id, inv.name]
    );
    if (existing.length === 0) {
      await query(
        'INSERT INTO inventory (vendor_id, ingredient_name, stock_quantity, unit, reorder_level) VALUES (?, ?, ?, ?, ?)',
        [inv.vendor_id, inv.name, inv.stock, inv.unit, inv.reorder]
      );
    }
  }

  const allInventory = await query('SELECT * FROM inventory');
  const truffleOil = allInventory.find(i => i.ingredient_name === 'Truffle Oil');
  const pastaFlour = allInventory.find(i => i.ingredient_name === 'Artisanal Pasta Flour');

  // 3. Seed Relational Dishes in MySQL
  const dishesToSeed = [
    // Mario Dishes
    { vendor_id: vendorMario.user_id, name: 'Signature Truffle Tagliatelle', category: 'Fresh Pastas', price: 24.50 },
    { vendor_id: vendorMario.user_id, name: 'Handmade Parmigiano Ravioli', category: 'Fresh Pastas', price: 21.00 },
    { vendor_id: vendorMario.user_id, name: 'Wild Mushroom Truffle Gnocchi', category: 'Fresh Pastas', price: 23.00 },
    { vendor_id: vendorMario.user_id, name: 'Truffle Burrata Flatbread', category: 'Pizzas & Starters', price: 17.50 },
    { vendor_id: vendorMario.user_id, name: 'Classic Garlic Herb Focaccia', category: 'Pizzas & Starters', price: 8.50 },
    { vendor_id: vendorMario.user_id, name: 'Traditional Espresso Tiramisu', category: 'Desserts & Drinks', price: 9.50 },

    // Priya Dishes
    { vendor_id: vendorPriya.user_id, name: 'Shahi Paneer Tikka Masala', category: 'Royal Curries', price: 18.50 },
    { vendor_id: vendorPriya.user_id, name: 'Slow-Cooked Butter Chicken', category: 'Royal Curries', price: 19.50 },
    { vendor_id: vendorPriya.user_id, name: 'Aromatic Royal Dum Biryani', category: 'Biryanis & Breads', price: 19.99 },
    { vendor_id: vendorPriya.user_id, name: 'Garlic Butter Naan (2 pcs)', category: 'Biryanis & Breads', price: 4.50 },
    { vendor_id: vendorPriya.user_id, name: 'Chilled Mango Lassi Smoothie', category: 'Desserts & Drinks', price: 5.50 },

    // Kenji Dishes
    { vendor_id: vendorKenji.user_id, name: 'Rich Tonkotsu Pork Ramen', category: 'Ramen & Bowls', price: 18.00 },
    { vendor_id: vendorKenji.user_id, name: 'Crispy Chicken Katsu Curry Bowl', category: 'Ramen & Bowls', price: 17.50 },
    { vendor_id: vendorKenji.user_id, name: 'Pan-Seared Pork Gyoza (6 pcs)', category: 'Sides & Appetizers', price: 8.50 }
  ];

  for (const d of dishesToSeed) {
    const existing = await query(
      'SELECT dish_id FROM dishes WHERE vendor_id = ? AND LOWER(name) = LOWER(?)',
      [d.vendor_id, d.name]
    );
    if (existing.length === 0) {
      await query(
        'INSERT INTO dishes (vendor_id, name, category, base_price, daily_stock, is_available) VALUES (?, ?, ?, ?, ?, 1)',
        [d.vendor_id, d.name, d.category, d.price, d.daily_stock || 15]
      );
    }
  }

  const allDishes = await query('SELECT * FROM dishes');

  // 4. Seed Relational Dish Recipes Junction Table in MySQL
  for (const dish of allDishes) {
    let ingId = truffleOil ? truffleOil.ingredient_id : 1;
    let qty = 0.1;
    if (dish.name.includes('Ravioli') || dish.name.includes('Tagliatelle')) {
      ingId = pastaFlour ? pastaFlour.ingredient_id : 1;
      qty = 0.25;
    }

    const existing = await query(
      'SELECT recipe_id FROM dish_recipes WHERE dish_id = ? AND ingredient_id = ?',
      [dish.dish_id, ingId]
    );
    if (existing.length === 0) {
      await query(
        'INSERT INTO dish_recipes (dish_id, ingredient_id, quantity_required) VALUES (?, ?, ?)',
        [dish.dish_id, ingId, qty]
      );
    }
  }

  // High-Res Image Mapping
  const imageMap = {
    'Signature Truffle Tagliatelle': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    'Handmade Parmigiano Ravioli': 'https://images.unsplash.com/photo-1587740896339-96a761e0508d?auto=format&fit=crop&w=600&q=80',
    'Wild Mushroom Truffle Gnocchi': 'https://images.unsplash.com/photo-1621996346565-e3d5d6281313?auto=format&fit=crop&w=600&q=80',
    'Truffle Burrata Flatbread': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    'Classic Garlic Herb Focaccia': 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=600&q=80',
    'Traditional Espresso Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    'Shahi Paneer Tikka Masala': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    'Slow-Cooked Butter Chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    'Aromatic Royal Dum Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    'Garlic Butter Naan (2 pcs)': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    'Chilled Mango Lassi Smoothie': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    'Rich Tonkotsu Pork Ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'Crispy Chicken Katsu Curry Bowl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    'Pan-Seared Pork Gyoza (6 pcs)': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80'
  };

  // Sync relational dishes table image_url and description
  for (const dish of allDishes) {
    if (imageMap[dish.name]) {
      await query('UPDATE dishes SET image_url = COALESCE(image_url, ?), description = COALESCE(description, ?) WHERE dish_id = ?', [
        imageMap[dish.name],
        'Handcrafted daily with organic ingredients.',
        dish.dish_id
      ]);
    }
  }

  // 5. Seed MongoDB Menus with Food Hero Images
  const marioDishes = allDishes.filter(d => d.vendor_id === vendorMario.user_id);
  const priyaDishes = allDishes.filter(d => d.vendor_id === vendorPriya.user_id);
  const kenjiDishes = allDishes.filter(d => d.vendor_id === vendorKenji.user_id);

  const mongoMenus = [
    {
      vendor_id: vendorMario.user_id,
      business_name: 'Chef Mario Truffle Kitchen',
      cuisine_types: ['Italian', 'Artisanal Pasta', 'Ghost Kitchen'],
      chef_bio: 'Michelin-trained chef specializing in handcrafted Italian pasta & flatbreads made daily with imported truffles.',
      hero_image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
      operating_hours: '11:00 AM - 10:00 PM',
      categories: [
        {
          category_name: 'Fresh Pastas',
          dishes: marioDishes.filter(d => d.category === 'Fresh Pastas').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Handcrafted daily with organic semolina flour and 24-month aged Parmigiano Reggiano.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Chef Special', 'Fresh']
          }))
        },
        {
          category_name: 'Pizzas & Starters',
          dishes: marioDishes.filter(d => d.category === 'Pizzas & Starters').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Wood-fired oven dough topped with fresh burrata and extra virgin olive oil.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Artisanal']
          }))
        },
        {
          category_name: 'Desserts & Drinks',
          dishes: marioDishes.filter(d => d.category === 'Desserts & Drinks').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Classic mascarpone espresso coffee dessert.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Sweet']
          }))
        }
      ]
    },
    {
      vendor_id: vendorPriya.user_id,
      business_name: 'Chef Priya Royal Spice',
      cuisine_types: ['North Indian', 'Curries', 'Independent Chef'],
      chef_bio: 'Heritage recipes passed down through 3 generations of Royal Mughlai kitchens.',
      hero_image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
      operating_hours: '12:00 PM - 11:00 PM',
      categories: [
        {
          category_name: 'Royal Curries',
          dishes: priyaDishes.filter(d => d.category === 'Royal Curries').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Simmered overnight in cashew and tomato reduction with aromatic whole spices.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Authentic']
          }))
        },
        {
          category_name: 'Biryanis & Breads',
          dishes: priyaDishes.filter(d => d.category === 'Biryanis & Breads').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Long-grain saffron Basmati rice cooked under sealed dum pressure.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Chef Special']
          }))
        },
        {
          category_name: 'Desserts & Drinks',
          dishes: priyaDishes.filter(d => d.category === 'Desserts & Drinks').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Refreshing Alphonso mango yogurt beverage.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Chilled']
          }))
        }
      ]
    },
    {
      vendor_id: vendorKenji.user_id,
      business_name: 'Chef Kenji Tokyo Street Eats',
      cuisine_types: ['Japanese', 'Ramen & Bowls', 'Ghost Kitchen'],
      chef_bio: 'Tokyo night market inspired ramen and crispy katsu bowls crafted with 12-hour broth.',
      hero_image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
      operating_hours: '11:30 AM - 10:30 PM',
      categories: [
        {
          category_name: 'Ramen & Bowls',
          dishes: kenjiDishes.filter(d => d.category === 'Ramen & Bowls').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Served with ajitsuke tamago egg, bamboo shoots, and nori seaweed.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Japanese']
          }))
        },
        {
          category_name: 'Sides & Appetizers',
          dishes: kenjiDishes.filter(d => d.category === 'Sides & Appetizers').map(d => ({
            dish_id: d.dish_id,
            name: d.name,
            description: 'Pan-seared crispy dumplings served with ponzu dipping sauce.',
            price: Number(d.base_price),
            image_url: imageMap[d.name] || 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
            dietary_tags: ['Appetizer']
          }))
        }
      ]
    }
  ];

  await MongoAdapter.findOrSeedVendorMenus(mongoMenus);

  // 6. Seed Rider Logistics
  await MongoAdapter.upsertRider(riderDavid.user_id, {
    vehicle_type: 'EV Scooter',
    license_plate: 'EV-884-SPEED',
    shift_status: 'ONLINE',
    live_coordinates: { lat: 12.9716, lng: 77.5946 },
    total_deliveries_completed: 56
  });

  // 7. Seed Initial Customer Ratings & Reviews
  const sampleReviews = [
    {
      review_id: 101,
      order_id: 1,
      customer_id: customerAlex ? customerAlex.user_id : 5,
      vendor_id: vendorMario ? vendorMario.user_id : 2,
      rider_id: riderDavid ? riderDavid.user_id : 7,
      vendor_rating: 5,
      rider_rating: 5,
      comment: 'Absolutely incredible Signature Truffle Tagliatelle! Delivered hot and fresh by David.',
      sentiment_label: 'POSITIVE',
      created_at: new Date(Date.now() - 3600000 * 2)
    },
    {
      review_id: 102,
      order_id: 2,
      customer_id: customerAlex ? customerAlex.user_id : 5,
      vendor_id: vendorPriya ? vendorPriya.user_id : 3,
      rider_id: riderDavid ? riderDavid.user_id : 7,
      vendor_rating: 5,
      rider_rating: 4,
      comment: 'Authentic royal dum biryani with perfect spice balance. Great packaging!',
      sentiment_label: 'POSITIVE',
      created_at: new Date(Date.now() - 3600000 * 24)
    },
    {
      review_id: 103,
      order_id: 3,
      customer_id: customerAlex ? customerAlex.user_id : 5,
      vendor_id: vendorKenji ? vendorKenji.user_id : 4,
      rider_id: riderDavid ? riderDavid.user_id : 7,
      vendor_rating: 4,
      rider_rating: 5,
      comment: 'Rich tonkotsu broth, very tasty ramen egg. Will order again!',
      sentiment_label: 'POSITIVE',
      created_at: new Date(Date.now() - 3600000 * 48)
    }
  ];

  for (const r of sampleReviews) {
    const existing = await MongoAdapter.getReviews({ vendor_id: r.vendor_id });
    if (!existing || existing.length === 0) {
      await MongoAdapter.upsertReview(r);
    }
  }

  console.log('--- ChefHub Seeding Complete with High-Res Food Photos & Reviews! ---');
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
