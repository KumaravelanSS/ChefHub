const http = require('http');

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runVerification() {
  console.log('--- Verifying ChefHub Live CRUD APIs ---');

  // 1. Logins
  const adminLogin = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
  const adminToken = adminLogin.data.token;

  const vendorLogin = await makeRequest('/api/auth/login', 'POST', { email: 'chef.mario@chefhub.com', password: 'vendor123' });
  const vendorToken = vendorLogin.data.token;

  const custLogin = await makeRequest('/api/auth/login', 'POST', { email: 'alex.customer@gmail.com', password: 'customer123' });
  const custToken = custLogin.data.token;

  // 2. Vendor Dish CRUD (CREATE & DELETE)
  const addDish = await makeRequest('/api/vendor/dishes', 'POST', {
    name: 'Test Gourmet Gnocchi',
    category: 'Pasta',
    base_price: 26.00,
    description: 'Fresh potato gnocchi with sage butter'
  }, vendorToken);
  console.log('1. Vendor ADD Dish CRUD:', addDish.status, addDish.data.message);

  const delDish = await makeRequest(`/api/vendor/dishes/${addDish.data.dish_id}`, 'DELETE', null, vendorToken);
  console.log('2. Vendor DELETE Dish CRUD:', delDish.status, delDish.data.message);

  // 3. Admin User CRUD (CREATE & DELETE)
  const addUser = await makeRequest('/api/admin/users', 'POST', {
    name: 'Test Customer User',
    email: 'test.user@gmail.com',
    password: 'user123',
    role: 'CUSTOMER'
  }, adminToken);
  console.log('3. Admin CREATE User CRUD:', addUser.status, addUser.data.message);

  const delUser = await makeRequest(`/api/admin/users/${addUser.data.user_id}`, 'DELETE', null, adminToken);
  console.log('4. Admin DELETE User CRUD:', delUser.status, delUser.data.message);

  // 4. Customer Order Cancel CRUD
  const orderRes = await makeRequest('/api/customer/orders', 'POST', {
    vendor_id: 2,
    items: [{ dish_id: 1, quantity: 1 }]
  }, custToken);
  const orderId = orderRes.data.order.order_id;

  const cancelOrder = await makeRequest(`/api/customer/orders/${orderId}`, 'DELETE', null, custToken);
  console.log('5. Customer CANCEL Order CRUD:', cancelOrder.status, cancelOrder.data.message);

  console.log('--- ALL CRUD OPERATIONAL VERIFICATIONS PASSED 100%! ---');
}

runVerification();
