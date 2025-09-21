# 🍕 Favilla's NY Pizza - GloriaFoods-Style Backend

A comprehensive restaurant management system with automatic thermal printer integration, inspired by GloriaFoods functionality.

## ✨ Features
<!-- Fix: Updated SUPABASE_URL environment variable with https:// protocol -->

### 🖨️ **Automatic Thermal Printer Integration**
- **Epson TM-M30II** thermal printer support
- **Automatic kitchen ticket printing** when orders are placed
- **Automatic receipt printing** when orders are completed
- **Real-time printer status monitoring**
- **Test print functionality**
- **Printer configuration management**

### 📊 **Comprehensive Admin Dashboard**
- **Order Management** - View, update, and manage all orders
- **Menu Management** - Add, edit, delete menu items
- **Customer Management** - View customer data and order history
- **Analytics & Reports** - Sales analytics, revenue tracking
- **Printer Management** - Monitor and configure thermal printer
- **Real-time Updates** - WebSocket notifications for kitchen display

### 🍽️ **Kitchen Display System**
- **Real-time order notifications**
- **Order status tracking** (Pending → Processing → Completed)
- **Automatic kitchen ticket printing**
- **Order prioritization**
- **Kitchen staff interface**

### 💳 **Payment Processing**
- **Stripe integration** for secure payments
- **Payment status tracking**
- **Automatic receipt generation**

### 🔐 **Authentication & Security**
- **Custom authentication system**
- **Admin role management**
- **Session management**
- **Protected routes**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- Epson TM-M30II thermal printer (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PizzaSpinRewards
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Database
   DATABASE_URL="postgresql://username:password@host:port/database"
   
   # Stripe (optional)
   STRIPE_SECRET_KEY="your_stripe_secret_key_here"
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - **Frontend**: http://localhost:5000
   - **Admin Dashboard**: http://localhost:5000/admin
   - **Kitchen Display**: http://localhost:5000/kitchen

## 🖨️ Printer Setup

### Epson TM-M30II Configuration

1. **Connect the printer** via USB to your computer
2. **Identify the COM port** (usually COM3 on Windows)
3. **Configure in Admin Dashboard**:
   - Go to Admin Dashboard → Printer tab
   - Set COM Port (e.g., COM3)
   - Set Baud Rate (usually 9600)
   - Click "Test Print" to verify connection

### Printer Features
- **Automatic kitchen tickets** when orders are placed
- **Automatic receipts** when orders are completed
- **Test print functionality**
- **Real-time status monitoring**
- **Configuration management**

## 📊 Admin Dashboard Features

### Overview Tab
- **Order statistics** (Total, Pending, Processing, Completed)
- **Revenue tracking** (Total revenue, average order value)
- **Menu item count**
- **Recent orders list**
- **Quick action buttons**

### Orders Tab
- **Complete order management**
- **Order status updates** (Start/Complete)
- **Order details** (Items, customer info, payment status)
- **Order filtering and search**
- **Bulk operations**

### Menu Tab
- **Menu item management** (Add/Edit/Delete)
- **Category organization**
- **Price management**
- **Image uploads**
- **Bulk menu operations**

### Analytics Tab
- **Sales analytics**
- **Revenue reports**
- **Order status distribution**
- **Date range filtering**
- **Export capabilities**

### Printer Tab
- **Real-time printer status**
- **Test print functionality**
- **Printer configuration**
- **Connection management**
- **Print history**

## 🔌 API Endpoints

### Order Management
```
GET    /api/orders/analytics     # Order analytics
PATCH  /api/orders/:id/status    # Update order status
POST   /api/orders               # Create new order
GET    /api/orders               # Get all orders
```

### Menu Management
```
GET    /api/menu                 # Get all menu items
POST   /api/menu                 # Create menu item
PUT    /api/menu/:id             # Update menu item
DELETE /api/menu/:id             # Delete menu item
POST   /api/menu/bulk            # Bulk menu operations
```

### Kitchen Display
```
GET    /api/kitchen/orders       # Get active orders
POST   /api/kitchen/orders/:id/start    # Start order
POST   /api/kitchen/orders/:id/complete # Complete order
```

### Printer Management
```
GET    /api/printer/status       # Get printer status
POST   /api/printer/test         # Test print
POST   /api/printer/connect      # Connect printer
```

### Customer Management
```
GET    /api/customers            # Get all customers
GET    /api/customers/:id/orders # Get customer orders
```

### Settings
```
GET    /api/settings             # Get system settings
PUT    /api/settings             # Update settings
```

## 🏗️ Architecture

### Backend Stack
- **Node.js** with TypeScript
- **Express.js** for API server
- **PostgreSQL** with Drizzle ORM
- **WebSocket** for real-time updates
- **Stripe** for payments
- **Thermal printer** integration

### Frontend Stack
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **Wouter** for routing

### Database Schema
- **Users** - Customer and admin accounts
- **Menu Items** - Restaurant menu
- **Orders** - Customer orders
- **Order Items** - Individual items in orders
- **Rewards** - Customer loyalty system

## 🔧 Development

### Database Migrations
```bash
npm run db:push
```

### Type Checking
```bash
npm run check
```

### Production Build
```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Printer Issues
1. **Check COM port** - Verify printer is on correct port
2. **Test connection** - Use "Test Print" in admin dashboard
3. **Check drivers** - Ensure Epson drivers are installed
4. **Restart printer** - Power cycle the thermal printer

### Database Issues
1. **Check DATABASE_URL** - Verify connection string
2. **Run migrations** - `npm run db:push`
3. **Check Supabase** - Verify database is accessible

### Authentication Issues
1. **Clear browser cache** - Clear cookies and local storage
2. **Check session** - Verify user is logged in
3. **Admin access** - Ensure user has admin privileges

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support, please contact:
- **Email**: support@favillas.com
- **Phone**: (555) 123-4567

---

**Built with ❤️ for Favilla's NY Pizza**

