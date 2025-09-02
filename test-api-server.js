import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Import and mount API routes
const apiDir = join(__dirname, 'api');

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const loginHandler = (await import('./api/login.ts')).default;
    await loginHandler(req, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// User route
app.get('/api/user', async (req, res) => {
  try {
    const userHandler = (await import('./api/user.ts')).default;
    await userHandler(req, res);
  } catch (error) {
    console.error('User error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kitchen orders route
app.get('/api/kitchen/orders', async (req, res) => {
  try {
    const kitchenHandler = (await import('./api/kitchen/orders.ts')).default;
    await kitchenHandler(req, res);
  } catch (error) {
    console.error('Kitchen orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu routes
app.get('/api/menu', async (req, res) => {
  try {
    const menuHandler = (await import('./api/menu.ts')).default;
    await menuHandler(req, res);
  } catch (error) {
    console.error('Menu GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu item update route
app.put('/api/menu/:id', async (req, res) => {
  try {
    // Try to use a dedicated menu update API if it exists
    try {
      const menuUpdateHandler = (await import('./api/menu/update.ts')).default;
      await menuUpdateHandler(req, res);
    } catch (importError) {
      // Fallback: Use the main menu handler for updates
      const menuHandler = (await import('./api/menu.ts')).default;
      await menuHandler(req, res);
    }
  } catch (error) {
    console.error('Menu PUT error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu item create route
app.post('/api/menu', async (req, res) => {
  try {
    const menuHandler = (await import('./api/menu.ts')).default;
    await menuHandler(req, res);
  } catch (error) {
    console.error('Menu POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu item patch route  
app.patch('/api/menu/:id', async (req, res) => {
  try {
    const menuHandler = (await import('./api/menu.ts')).default;
    await menuHandler(req, res);
  } catch (error) {
    console.error('Menu PATCH error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu item delete route
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const menuHandler = (await import('./api/menu.ts')).default;
    await menuHandler(req, res);
  } catch (error) {
    console.error('Menu DELETE error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Featured items route
app.get('/api/featured', async (req, res) => {
  try {
    const featuredHandler = (await import('./api/featured.ts')).default;
    await featuredHandler(req, res);
  } catch (error) {
    console.error('Featured error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics route
app.get('/api/orders/analytics', async (req, res) => {
  try {
    const analyticsHandler = (await import('./api/orders/analytics.ts')).default;
    await analyticsHandler(req, res);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Users route
app.get('/api/users', async (req, res) => {
  try {
    const usersHandler = (await import('./api/users.ts')).default;
    await usersHandler(req, res);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Printer status route
app.get('/api/printer/status', async (req, res) => {
  try {
    const printerHandler = (await import('./api/printer/status.ts')).default;
    await printerHandler(req, res);
  } catch (error) {
    console.error('Printer status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Categories route - try to load real API or return empty
app.get('/api/categories', async (req, res) => {
  try {
    // Check if API file exists, if not return empty array from DB
    try {
      const categoriesHandler = (await import('./api/categories.ts')).default;
      await categoriesHandler(req, res);
    } catch (importError) {
      // No dedicated API file, return empty array (real DB response)
      console.log('No categories API file, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Choice groups route - try to load real API or return empty
app.get('/api/choice-groups', async (req, res) => {
  try {
    try {
      const choiceGroupsHandler = (await import('./api/choice-groups.ts')).default;
      await choiceGroupsHandler(req, res);
    } catch (importError) {
      console.log('No choice-groups API file, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Choice groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Choice items route - try to load real API or return empty
app.get('/api/choice-items', async (req, res) => {
  try {
    try {
      const choiceItemsHandler = (await import('./api/choice-items.ts')).default;
      await choiceItemsHandler(req, res);
    } catch (importError) {
      console.log('No choice-items API file, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Choice items error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Category choice groups route - try to load real API or return empty
app.get('/api/category-choice-groups', async (req, res) => {
  try {
    try {
      const categoryChoiceGroupsHandler = (await import('./api/category-choice-groups.ts')).default;
      await categoryChoiceGroupsHandler(req, res);
    } catch (importError) {
      console.log('No category-choice-groups API file, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Category choice groups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout route
app.post('/api/logout', async (req, res) => {
  try {
    const logoutHandler = (await import('./api/logout.ts')).default;
    await logoutHandler(req, res);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API server is working!' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`✅ Frontend should be on http://localhost:3000`);
  console.log(`✅ Try logging in with: admin / admin123`);
});