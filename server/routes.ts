import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import Stripe from "stripe";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { setupTimeTrackingRoutes } from "./time-tracking-routes";
import { db } from "./db";
import { insertMenuItemSchema, insertOrderSchema, insertOrderItemSchema, insertRewardSchema, insertUserRewardSchema, insertPromoCodeSchema, insertChoiceGroupSchema, insertChoiceItemSchema, insertMenuItemChoiceGroupSchema, insertCategoryChoiceGroupSchema, insertTaxCategorySchema, insertTaxSettingsSchema, insertPauseServiceSchema, insertHalfHalfToppingSchema, insertHalfHalfSettingsSchema, orders, orderItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { log } from "./vite";
import { sendToPrinter, testPrinter, printReceipt, printAllReceipts, printAllReceiptsAuto, printCustomerReceipt, printKitchenTicket, printRecordsCopy, testPrimaryPrinter, discoverNetworkPrinters, type OrderData } from "./printer";
import { shipdayService } from "./shipday";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const scryptAsync = promisify(scrypt);

// Template processing helpers
function processTemplate(template: string, data: any): string {
  let processed = template;
  
  // Simple variable replacement
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
  });
  
  // Handle items loop
  if (data.items && Array.isArray(data.items)) {
    const itemsMatch = processed.match(/{{#items}}([\s\S]*?){{\/items}}/);
    if (itemsMatch) {
      const itemTemplate = itemsMatch[1];
      const itemsContent = data.items.map((item: any) => {
        let itemContent = itemTemplate;
        itemContent = itemContent.replace(/{{quantity}}/g, item.quantity);
        itemContent = itemContent.replace(/{{name}}/g, item.name);
        itemContent = itemContent.replace(/{{price}}/g, item.price?.toFixed(2) || '0.00');
        itemContent = itemContent.replace(/{{itemTotal}}/g, (item.price * item.quantity).toFixed(2));
        
        // Handle modifications
        if (item.modifications?.length) {
          const modText = item.modifications.map((mod: string) => `  + ${mod}`).join('\n');
          itemContent = itemContent.replace(/{{#modifications}}[\s\S]*?{{\/modifications}}/g, modText);
        } else {
          itemContent = itemContent.replace(/{{#modifications}}[\s\S]*?{{\/modifications}}/g, '');
        }
        
        return itemContent;
      }).join('');
      
      processed = processed.replace(/{{#items}}[\s\S]*?{{\/items}}/g, itemsContent);
    }
  }
  
  // Handle conditional sections
  processed = processed.replace(/{{#isPickup}}([\s\S]*?){{\/isPickup}}/g, 
    data.orderType === 'pickup' ? '$1' : '');
  processed = processed.replace(/{{#isDelivery}}([\s\S]*?){{\/isDelivery}}/g, 
    data.orderType === 'delivery' ? '$1' : '');
  processed = processed.replace(/{{#deliveryAddress}}([\s\S]*?){{\/deliveryAddress}}/g, 
    data.deliveryAddress ? '$1' : '');
  
  return processed;
}

function getDefaultCustomerTemplate(): string {
  return `FAVILLA'S NY PIZZA
123 Main St, Asheville, NC
(828) 555-0123
======================

Order #: {{orderNumber}}
Time: {{orderTime}}
Customer: {{customerName}}
Ready: {{estimatedReadyTime}}
Type: {{orderType}}

ITEMS:
----------------------
{{#items}}
{{quantity}}x {{name}}
{{#modifications}}
  + {{.}}
{{/modifications}}
    ${{itemTotal}}
{{/items}}

======================
TOTAL: ${{total}}
Payment: {{paymentMethod}}

Thank you for your order!
{{#isPickup}}
Please wait for pickup call
{{/isPickup}}
{{#isDelivery}}
Your order is being prepared
for delivery
{{/isDelivery}}

Visit us again soon!`;
}

function getDefaultKitchenTemplate(): string {
  return `*** KITCHEN COPY ***
===================

ORDER #{{orderNumber}}
{{orderTime}}
Customer: {{customerName}}
Type: {{orderType}}
{{#deliveryAddress}}
Address: {{deliveryAddress}}
{{/deliveryAddress}}

ITEMS TO PREPARE:
-----------------
{{#items}}
[{{quantity}}] {{name}}
{{#modifications}}
  >> {{.}}
{{/modifications}}
{{#specialInstructions}}
  ** {{specialInstructions}}
{{/specialInstructions}}

{{/items}}
===================
{{#isDelivery}}
   DELIVERY ORDER   
{{/isDelivery}}
{{#isPickup}}
   PICKUP ORDER     
{{/isPickup}}
{{#estimatedReadyTime}}
Ready by: {{estimatedReadyTime}}
{{/estimatedReadyTime}}`;
}

function getDefaultRecordsTemplate(): string {
  return `*** RECORDS COPY ***
FAVILLA'S NY PIZZA
===================

Order #: {{orderNumber}}
Date/Time: {{orderTime}}
Order Type: {{orderType}}
Staff: {{staffMember}}

CUSTOMER INFO:
--------------
Name: {{customerName}}
Phone: {{customerPhone}}
Email: {{customerEmail}}
{{#deliveryAddress}}
Address: {{deliveryAddress}}
{{/deliveryAddress}}

ORDER DETAILS:
--------------
{{#items}}
{{quantity}}x {{name}} @ ${{price}}
{{#modifications}}
  + {{.}}
{{/modifications}}
{{#specialInstructions}}
  Note: {{specialInstructions}}
{{/specialInstructions}}
  Subtotal: ${{itemTotal}}

{{/items}}
===================
TOTAL: ${{total}}
Payment: {{paymentMethod}}

Record kept for business
accounting purposes`;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('=== REGISTERING ROUTES ===');
  
  // Debug middleware to see all requests
  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.originalUrl} -> ${req.path}`);
    next();
  });

  // Set up authentication routes
  setupAuth(app);
  
  // Set up time tracking routes
  setupTimeTrackingRoutes(app);

  // TEST ROUTE to verify our routes are working
  console.log('=== REGISTERING TEST ROUTE: /api/test-route ===');
  app.get("/api/test-route", (req, res) => {
    console.log('=== TEST ROUTE HIT ===');
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    console.log('Original URL:', req.originalUrl);
    res.json({ message: "Test route working!" });
  });

  // Image Upload API Route - must be defined early to avoid conflicts
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/image-upload-test", upload.single('image'), async (req, res) => {
    try {
      console.log('=== UPLOAD ENDPOINT HIT ===');
      console.log('Request path:', req.path);
      console.log('File present:', req.file ? 'YES' : 'NO');
      console.log('Auth status:', req.isAuthenticated ? req.isAuthenticated() : 'NO AUTH METHOD');

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        console.log('Authentication failed');
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ error: "No image file provided" });
      }

      console.log('Processing file:', req.file.originalname, 'size:', req.file.size);

      // Create menu images directory if it doesn't exist
      const menuImagesDir = path.join(process.cwd(), 'client/public/images/menu');
      try {
        await fs.access(menuImagesDir);
      } catch {
        await fs.mkdir(menuImagesDir, { recursive: true });
        console.log('Created directory:', menuImagesDir);
      }

      // Generate unique filename
      const filename = `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
      const filepath = path.join(menuImagesDir, filename);

      console.log('Converting to WebP:', filepath);

      // Process and optimize image using Sharp
      await sharp(req.file.buffer)
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ 
          quality: 85,
          effort: 6 
        })
        .toFile(filepath);

      // Return the path relative to public directory
      const publicPath = `/images/menu/${filename}`;
      
      const response = { 
        success: true,
        imageUrl: publicPath,
        filename: filename
      };
      
      console.log('SUCCESS! Sending response:', response);
      res.json(response);

    } catch (error: any) {
      console.error('=== UPLOAD ERROR ===', error);
      const errorResponse = { 
        error: "Failed to process image",
        details: error.message 
      };
      console.log('Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  });

  // Half & Half API Routes
  app.get("/api/half-half/status", async (req, res) => {
    try {
      const settings = await storage.getHalfHalfSettings();
      res.json({ 
        isEnabled: settings?.isEnabled ?? false,
        choiceGroupId: settings?.choiceGroupId ?? null
      });
    } catch (error: any) {
      console.error("Error getting half & half status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/half-half/toppings", async (req, res) => {
    try {
      const toppings = await storage.getAllHalfHalfToppings();
      
      // Separate into regular and specialty toppings
      const regularToppings = toppings.filter(t => t.category === 'regular' && t.isActive);
      const specialtyToppings = toppings.filter(t => t.category === 'specialty' && t.isActive);
      
      res.json({
        regular: regularToppings,
        specialty: specialtyToppings
      });
    } catch (error: any) {
      console.error("Error getting half & half toppings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/half-half/toppings", async (req, res) => {
    try {
      const parsed = insertHalfHalfToppingSchema.parse(req.body);
      const topping = await storage.createHalfHalfTopping(parsed);
      res.status(201).json(topping);
    } catch (error: any) {
      console.error("Error creating half & half topping:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.put("/api/half-half/toppings/reorder", async (req, res) => {
    try {
      const updates = z.array(z.object({
        id: z.number(),
        order: z.number()
      })).parse(req.body);

      const success = await storage.updateHalfHalfToppingsOrder(updates);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to update topping order" });
      }
      
      res.json({ message: "Topping order updated successfully" });
    } catch (error: any) {
      console.error("Error updating half & half toppings order:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.put("/api/half-half/toppings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topping ID" });
      }

      const parsed = insertHalfHalfToppingSchema.partial().parse(req.body);
      const topping = await storage.updateHalfHalfTopping(id, parsed);
      
      if (!topping) {
        return res.status(404).json({ message: "Topping not found" });
      }
      
      res.json(topping);
    } catch (error: any) {
      console.error("Error updating half & half topping:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  app.delete("/api/half-half/toppings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topping ID" });
      }

      const success = await storage.deleteHalfHalfTopping(id);
      
      if (!success) {
        return res.status(404).json({ message: "Topping not found" });
      }
      
      res.json({ message: "Topping deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting half & half topping:", error);
      res.status(500).json({ message: error.message });
    }
  });


  app.put("/api/half-half/system", async (req, res) => {
    try {
      const { isEnabled } = z.object({
        isEnabled: z.boolean()
      }).parse(req.body);

      let choiceGroupId = null;
      
      if (isEnabled) {
        // Create or update the half & half choice group when enabling
        const existingGroups = await storage.getAllChoiceGroups();
        const halfHalfGroup = existingGroups.find(group => group.name === "Half & Half");
        
        if (halfHalfGroup) {
          choiceGroupId = halfHalfGroup.id;
        } else {
          // Create new half & half choice group
          const newGroup = await storage.createChoiceGroup({
            name: "Half & Half",
            description: "Choose toppings for each half of your pizza",
            order: 100,
            isActive: true,
            isRequired: false,
            maxSelections: null,
            minSelections: 0
          });
          choiceGroupId = newGroup.id;
        }
      }

      const settings = await storage.updateHalfHalfSettings({
        isEnabled,
        choiceGroupId
      });
      
      res.json(settings);
    } catch (error: any) {
      console.error("Error updating half & half system:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });
  
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time order notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Track connected clients
  const kitchenClients: WebSocket[] = [];
  const customerClients: Map<number, WebSocket> = new Map(); // userId -> WebSocket
  
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Register client as kitchen display
        if (data.type === 'register' && data.client === 'kitchen') {
          kitchenClients.push(ws);
          log('Kitchen client connected', 'WebSocket');
        }
        
        // Register client as customer
        if (data.type === 'register' && data.client === 'customer' && data.userId) {
          customerClients.set(data.userId, ws);
          log(`Customer client connected for user ${data.userId}`, 'WebSocket');
        }
      } catch (error) {
        log(`WebSocket message error: ${error}`, 'WebSocket');
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket error: ${error}`, 'WebSocket');
    });
    
    ws.on('close', () => {
      // Remove from kitchen clients
      const index = kitchenClients.indexOf(ws);
      if (index !== -1) {
        kitchenClients.splice(index, 1);
        log('Kitchen client disconnected', 'WebSocket');
      }
      
      // Remove from customer clients
      customerClients.forEach((client, userId) => {
        if (client === ws) {
          customerClients.delete(userId);
          log(`Customer client disconnected for user ${userId}`, 'WebSocket');
        }
      });
    });
  });

  // Helper function to notify kitchen clients
  const notifyKitchen = (data: any) => {
    kitchenClients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      } catch (error) {
        log(`Error sending to kitchen client: ${error}`, 'WebSocket');
      }
    });
  };

  // Helper function to notify customer clients
  const notifyCustomer = (userId: number, data: any) => {
    const client = customerClients.get(userId);
    try {
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    } catch (error) {
      log(`Error sending to customer client ${userId}: ${error}`, 'WebSocket');
    }
  };

  // Printer API Routes
  app.post("/api/print", async (req, res) => {
    try {
      const { printerIp, text, fontSize, alignment, bold, underline, cut } = req.body;
      
      if (!printerIp || !text) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp and text" 
        });
      }

      const result = await sendToPrinter({
        printerIp,
        text,
        fontSize: fontSize || 'normal',
        alignment: alignment || 'left',
        bold: bold || false,
        underline: underline || false,
        cut: cut !== false // Default to true
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Print request failed", 
        error: error.message 
      });
    }
  });

  app.post("/api/print/test", async (req, res) => {
    try {
      const { printerIp } = req.body;
      
      if (!printerIp) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required field: printerIp" 
        });
      }

      const result = await testPrinter(printerIp);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Printer test failed", 
        error: error.message 
      });
    }
  });

  app.post("/api/print/receipt", async (req, res) => {
    try {
      const { 
        printerIp, 
        orderNumber, 
        items, 
        total, 
        customerName, 
        customerPhone, 
        orderTime 
      } = req.body;
      
      if (!printerIp || !orderNumber || !items || total === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp, orderNumber, items, total" 
        });
      }

      const result = await printReceipt({
        printerIp,
        orderNumber,
        items,
        total,
        customerName,
        customerPhone,
        orderTime
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Receipt print failed", 
        error: error.message 
      });
    }
  });

  // Spin Wheel API Routes
  app.get("/api/spin-wheel/config", async (req, res) => {
    try {
      // In a real app, this would come from the database
      // For now, return a default configuration
      const config = {
        slices: [
          {
            id: 1,
            label: "10% OFF",
            probability: 30,
            color: "#FF6B6B",
            isActive: true,
            reward: "10% discount on next order"
          },
          {
            id: 2,
            label: "FREE DRINK",
            probability: 20,
            color: "#4ECDC4",
            isActive: true,
            reward: "Free beverage with any order"
          },
          {
            id: 3,
            label: "FREE APPETIZER",
            probability: 15,
            color: "#45B7D1",
            isActive: true,
            reward: "Free appetizer with any order"
          },
          {
            id: 4,
            label: "20% OFF",
            probability: 10,
            color: "#96CEB4",
            isActive: true,
            reward: "20% discount on next order"
          },
          {
            id: 5,
            label: "FREE PIZZA",
            probability: 5,
            color: "#FFEAA7",
            isActive: true,
            reward: "Free medium pizza"
          },
          {
            id: 6,
            label: "TRY AGAIN",
            probability: 20,
            color: "#DDA0DD",
            isActive: true,
            reward: "Better luck next time!"
          }
        ]
      };
      
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to get spin wheel config", 
        error: error.message 
      });
    }
  });

  app.post("/api/spin-wheel/spin", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      // Get spin wheel configuration
      const config = {
        slices: [
          {
            id: 1,
            label: "10% OFF",
            probability: 30,
            color: "#FF6B6B",
            isActive: true,
            reward: "10% discount on next order"
          },
          {
            id: 2,
            label: "FREE DRINK",
            probability: 20,
            color: "#4ECDC4",
            isActive: true,
            reward: "Free beverage with any order"
          },
          {
            id: 3,
            label: "FREE APPETIZER",
            probability: 15,
            color: "#45B7D1",
            isActive: true,
            reward: "Free appetizer with any order"
          },
          {
            id: 4,
            label: "20% OFF",
            probability: 10,
            color: "#96CEB4",
            isActive: true,
            reward: "20% discount on next order"
          },
          {
            id: 5,
            label: "FREE PIZZA",
            probability: 5,
            color: "#FFEAA7",
            isActive: true,
            reward: "Free medium pizza"
          },
          {
            id: 6,
            label: "TRY AGAIN",
            probability: 20,
            color: "#DDA0DD",
            isActive: true,
            reward: "Better luck next time!"
          }
        ]
      };

      // Calculate total probability
      const totalProbability = config.slices
        .filter((slice: any) => slice.isActive)
        .reduce((sum: number, slice: any) => sum + slice.probability, 0);
      
      // Generate random number
      const random = Math.random() * totalProbability;
      
      // Find winning slice
      let currentSum = 0;
      let winningSlice = null;
      
      for (const slice of config.slices.filter((slice: any) => slice.isActive)) {
        currentSum += slice.probability;
        if (random <= currentSum) {
          winningSlice = slice;
          break;
        }
      }

      // In a real app, you would:
      // 1. Save the spin result to the database
      // 2. Add the reward to the user's account
      // 3. Send notifications
      
      log(`User ${req.user.id} spun the wheel and won: ${winningSlice?.label}`, "spin-wheel");

      res.json({
        success: true,
        reward: winningSlice,
        message: `Congratulations! You won: ${winningSlice?.label}`
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Spin failed", 
        error: error.message 
      });
    }
  });

  // Categories API Route
  app.get("/api/categories", async (req, res) => {
    try {
      log('GET /api/categories called', 'API');
      const categoriesList = await storage.getAllCategories();
      log(`Found ${categoriesList.length} categories`, 'API');
      res.json({ categories: categoriesList });
    } catch (error: any) {
      log(`Error in GET /api/categories: ${error.message}`, 'ERROR');
      res.status(500).json({ 
        success: false, 
        message: "Failed to get categories", 
        error: error.message 
      });
    }
  });

  // Create new category
  app.post("/api/categories", async (req, res) => {
    try {
      log('POST /api/categories called with data:', JSON.stringify(req.body), 'API');
      const category = await storage.createCategory(req.body);
      log('Category created successfully:', JSON.stringify(category), 'API');
      res.status(201).json(category);
    } catch (error: any) {
      log(`Error creating category: ${error.message}`, 'ERROR');
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to create category" 
      });
    }
  });

  // Update category
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.updateCategory(id, req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to update category" 
      });
    }
  });

  // Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to delete category" 
      });
    }
  });


  // User Management API Routes
  app.get("/api/users", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const userData = {
        ...req.body,
        createdBy: req.user.id,
        updatedAt: new Date()
      };

      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const id = parseInt(req.params.id);
      const userData = {
        ...req.body,
        updatedAt: new Date()
      };

      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const id = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Featured Menu Items API (for homepage)
  app.get("/api/featured", async (req, res) => {
    try {
      // Cache featured items for 10 minutes
      res.set('Cache-Control', 'public, max-age=600');
      
      const featuredItems = await storage.getFeaturedMenuItems();
      res.json(featuredItems);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch featured items" });
    }
  });

  // Menu Items API
  app.get("/api/menu", async (req, res) => {
    try {
      // Cache menu for 5 minutes since it doesn't change frequently
      res.set('Cache-Control', 'public, max-age=300');
      const menuItems = await storage.getAllMenuItems();
      
      // If no menu items exist, create some sample items with proper categories
      if (!menuItems || menuItems.length === 0) {
        const sampleItems = [
          // Traditional Pizza
          {
            id: 1,
            name: "Margherita Pizza",
            description: "Fresh mozzarella, tomato sauce, and basil",
            basePrice: "12.99",
            category: "Traditional Pizza",
            imageUrl: "/images/f1.png",
            isAvailable: true
          },
          {
            id: 2,
            name: "Pepperoni Pizza",
            description: "Classic pepperoni with mozzarella and tomato sauce",
            basePrice: "14.99",
            category: "Traditional Pizza",
            imageUrl: "/images/f2.jpg",
            isAvailable: true
          },
          
          // 10" Specialty Gourmet Pizzas
          {
            id: 3,
            name: "BBQ Chicken Pizza (10\")",
            description: "BBQ sauce, grilled chicken, red onions, and mozzarella",
            basePrice: "16.99",
            category: "10\" Specialty Gourmet Pizzas",
            imageUrl: "/images/f3.jpg",
            isAvailable: true
          },
          {
            id: 4,
            name: "Buffalo Chicken Pizza (10\")",
            description: "Buffalo sauce, grilled chicken, blue cheese, and celery",
            basePrice: "17.99",
            category: "10\" Specialty Gourmet Pizzas",
            imageUrl: "/images/f4.jpg",
            isAvailable: true
          },
          
          // 14" Specialty Gourmet Pizzas
          {
            id: 5,
            name: "Supreme Pizza (14\")",
            description: "Pepperoni, sausage, bell peppers, onions, mushrooms, olives",
            basePrice: "22.99",
            category: "14\" Specialty Gourmet Pizzas",
            imageUrl: "/images/f5.jpg",
            isAvailable: true
          },
          {
            id: 6,
            name: "Hawaiian Pizza (14\")",
            description: "Ham, pineapple, and mozzarella cheese",
            basePrice: "20.99",
            category: "14\" Specialty Gourmet Pizzas",
            imageUrl: "/images/f6.jpg",
            isAvailable: true
          },
          
          // 16" Specialty Gourmet Pizzas
          {
            id: 7,
            name: "Meat Lovers Pizza (16\")",
            description: "Pepperoni, sausage, bacon, ham, and mozzarella",
            basePrice: "28.99",
            category: "16\" Specialty Gourmet Pizzas",
            imageUrl: "/images/f1.png",
            isAvailable: true
          },
          
          // Sicilian Pizzas
          {
            id: 8,
            name: "Sicilian Margherita",
            description: "Thick crust Sicilian style with fresh mozzarella and basil",
            basePrice: "18.99",
            category: "Sicilian Pizzas",
            imageUrl: "/images/f2.jpg",
            isAvailable: true
          },
          
          // Appetizers
          {
            id: 9,
            name: "Garlic Bread",
            description: "Fresh baked bread with garlic butter and herbs",
            basePrice: "4.99",
            category: "Appetizers",
            imageUrl: "/images/f3.jpg",
            isAvailable: true
          },
          {
            id: 10,
            name: "Mozzarella Sticks",
            description: "Breaded mozzarella sticks served with marinara sauce",
            basePrice: "6.99",
            category: "Appetizers",
            imageUrl: "/images/f4.jpg",
            isAvailable: true
          },
          
          // Sides
          {
            id: 11,
            name: "Caesar Salad",
            description: "Fresh romaine lettuce, parmesan cheese, and caesar dressing",
            basePrice: "8.99",
            category: "Sides",
            imageUrl: "/images/f5.jpg",
            isAvailable: true
          },
          {
            id: 12,
            name: "French Fries",
            description: "Crispy golden fries served with ketchup",
            basePrice: "3.99",
            category: "Sides",
            imageUrl: "/images/f6.jpg",
            isAvailable: true
          },
          
          // Desserts
          {
            id: 13,
            name: "Tiramisu",
            description: "Classic Italian dessert with coffee and mascarpone",
            basePrice: "6.99",
            category: "Desserts",
            imageUrl: "/images/f1.png",
            isAvailable: true
          },
          {
            id: 14,
            name: "Chocolate Lava Cake",
            description: "Warm chocolate cake with molten center",
            basePrice: "7.99",
            category: "Desserts",
            imageUrl: "/images/f2.jpg",
            isAvailable: true
          },
          
          // Beverages
          {
            id: 15,
            name: "Coca-Cola",
            description: "Classic Coca-Cola soft drink",
            basePrice: "2.99",
            category: "Beverages",
            imageUrl: "/images/f3.jpg",
            isAvailable: true
          },
          {
            id: 16,
            name: "Italian Soda",
            description: "Sparkling water with flavored syrup",
            basePrice: "3.99",
            category: "Beverages",
            imageUrl: "/images/f4.jpg",
            isAvailable: true
          }
        ];
        
        // Add sample items to storage
        for (const item of sampleItems) {
          const { id, ...itemData } = item;
          await storage.createMenuItem(itemData);
        }
        
        res.json(sampleItems);
      } else {
        res.json(menuItems);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/menu/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu", async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Orders API
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const orders = await storage.getOrdersByUserId(req.user.id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user has permission to access this order
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active kitchen orders
  app.get("/api/kitchen/orders", async (req, res) => {
    // Allow kitchen access - for demo purposes, less restrictive
    // In production, you might want to check for kitchen staff role
    try {
      log('Fetching active orders...', 'API');
      const orders = await storage.getActiveOrders();
      log(`Found ${orders.length} active orders`, 'API');
      res.json(orders);
    } catch (error: any) {
      log(`Error fetching active orders: ${error.message}`, 'ERROR');
      log(`Stack trace: ${error.stack}`, 'ERROR');
      res.status(500).json({ message: error.message });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "processing", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(id, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Award points to user when order is completed
      if (status === 'completed' && updatedOrder.userId) {
        try {
          await storage.awardPointsForOrder(updatedOrder.userId, updatedOrder.id, parseFloat(updatedOrder.total));
        } catch (pointsError: any) {
          log(`Failed to award points for order #${id}: ${pointsError.message}`, 'server');
        }
      }
      
      // Notify kitchen about order status change
      notifyKitchen({
        type: 'orderStatusUpdate',
        order: updatedOrder
      });
      
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete order
  app.delete("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const deleted = await storage.deleteOrder(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete order" });
      }
      
      // Notify kitchen about order deletion
      notifyKitchen({
        type: 'orderDeleted',
        orderId: id
      });
      
      res.json({ message: "Order deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { amount, orderId } = req.body;
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          orderId: orderId.toString(),
          userId: req.user.id.toString()
        }
      });
      
      // Update the order with the payment intent ID
      if (orderId) {
        await storage.updateOrderPaymentIntent(orderId, paymentIntent.id);
      }
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create an order
  app.post("/api/orders", async (req, res) => {
    try {
      // Support both authenticated users and guest orders
      const userId = req.isAuthenticated() ? req.user.id : req.body.userId;
      
      const orderData = {
        ...req.body,
        userId: userId
      };
      
      const validatedData = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(validatedData);
      
      // Create order items
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          const orderItemData = {
            ...item,
            orderId: order.id
          };
          
          const validatedItemData = insertOrderItemSchema.parse(orderItemData);
          await storage.createOrderItem(validatedItemData);
        }
      }
      
      // Get the full order with items
      const completedOrder = await storage.getOrderWithItems(order.id);
      
      // Auto-accept orders when monitor mode is off (default behavior)
      // Monitor mode can be controlled via environment variable or settings
      const monitorMode = process.env.MONITOR_MODE === 'true';
      if (!monitorMode) {
        // Automatically start processing the order
        await storage.updateOrderStatus(order.id, 'processing');
        completedOrder.status = 'processing';
        
        log(`Order #${order.id} automatically accepted (monitor mode off)`, 'server');
        
        // For immediate orders, complete them right away so printing happens
        if (completedOrder.fulfillmentTime === 'asap') {
          await storage.updateOrderStatus(order.id, 'completed');
          completedOrder.status = 'completed';
          completedOrder.completedAt = new Date();
          
          log(`Order #${order.id} automatically completed (ASAP order)`, 'server');
        }
      }
      
      // Get menu item names for ShipDay integration
      const menuItemNames = new Map();
      for (const item of req.body.items) {
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (menuItem) {
          menuItemNames.set(item.menuItemId, menuItem.name);
        }
      }
      
      
      // Create ShipDay delivery order if this is a delivery order
      log(`Checking ShipDay API integration: orderType=${req.body.orderType}, hasAddressData=${!!req.body.addressData}, shipdayConfigured=${shipdayService.isConfigured()}`, 'server');
      log(`Address data: ${JSON.stringify(req.body.addressData)}`, 'server');
      
      if (req.body.orderType === "delivery" && req.body.addressData && shipdayService.isConfigured()) {
        try {
          const customerName = req.user ? `${req.user.firstName} ${req.user.lastName}` : "Guest Customer";
          const customerEmail = req.user?.email || "";
          
          // Format order for ShipDay API
          const shipdayOrderData = {
            orderId: `FAV-${completedOrder.id}`,
            customerName: customerName,
            customerPhone: req.body.phone,
            customerEmail: customerEmail,
            address: {
              fullAddress: req.body.addressData.fullAddress,
              street: req.body.addressData.street,
              city: req.body.addressData.city,
              state: req.body.addressData.state,
              zipCode: req.body.addressData.zipCode
            },
            items: req.body.items.map((item: any) => ({
              name: menuItemNames.get(item.menuItemId) || `Item #${item.menuItemId}`,
              quantity: item.quantity,
              price: parseFloat(item.price)
            })),
            totalAmount: parseFloat(req.body.total),
            specialInstructions: req.body.specialInstructions || "",
            restaurantName: "Favilla's NY Pizza",
            restaurantPhone: "(828) 555-0123",
            restaurantAddress: "123 Main St, Asheville, NC 28801"
          };

          log(`Creating ShipDay delivery order: ${JSON.stringify(shipdayOrderData, null, 2)}`, 'ShipDay');

          // Create delivery order using ShipDay API
          const shipdayResult = await shipdayService.createDeliveryOrder(shipdayOrderData);

          if (shipdayResult.success) {
            log(`ShipDay order created successfully for order #${completedOrder.id}: ${shipdayResult.orderId}`, 'ShipDay');
            
            // Update order with ShipDay info
            await storage.updateOrder(completedOrder.id, { 
              shipdayOrderId: shipdayResult.orderId,
              shipdayStatus: 'pending' 
            });

            // Also send webhook notification for tracking
            if (process.env.SHIPDAY_WEBHOOK_URL) {
              const webhookData = {
                action: 'order_created',
                orderId: completedOrder.id,
                shipdayOrderId: shipdayResult.orderId,
                status: 'pending'
              };

              await fetch(process.env.SHIPDAY_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookData)
              }).catch(err => log(`Webhook notification failed: ${err.message}`, 'ShipDay'));
            }
          } else {
            log(`ShipDay order creation failed for order #${completedOrder.id}: ${shipdayResult.error}`, 'ShipDay');
          }
          
        } catch (shipdayError: any) {
          log(`ShipDay API error for order #${completedOrder.id}: ${shipdayError.message}`, 'ShipDay');
        }
      }
      
      // Print all receipts automatically (customer, kitchen, records)
      try {
        const orderData: OrderData = {
          orderNumber: completedOrder.id.toString(),
          items: completedOrder.items.map((item: any) => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity,
            price: parseFloat(item.price),
            modifications: item.modifications || [],
            specialInstructions: item.specialInstructions,
            options: item.options || {},
            halfAndHalf: item.halfAndHalf || null
          })),
          total: parseFloat(completedOrder.total),
          customerName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Guest',
          customerPhone: completedOrder.phone,
          customerEmail: req.user?.email,
          orderTime: completedOrder.createdAt.toISOString(),
          orderType: completedOrder.orderType === 'delivery' ? 'delivery' : 'pickup',
          deliveryAddress: completedOrder.deliveryAddress,
          paymentMethod: 'card', // You might want to track this in the order
          staffMember: 'System', // You might want to track who processed the order
          estimatedReadyTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString() // 20 minutes from now
        };

        const printResults = await printAllReceiptsAuto(orderData);
        
        // Log individual print results
        if (printResults.customer.success) {
          log(`Customer receipt printed successfully for order #${completedOrder.id}`, 'server');
        } else {
          log(`Failed to print customer receipt for order #${completedOrder.id}: ${printResults.customer.error}`, 'server');
        }
        
        if (printResults.kitchen.success) {
          log(`Kitchen ticket printed successfully for order #${completedOrder.id}`, 'server');
        } else {
          log(`Failed to print kitchen ticket for order #${completedOrder.id}: ${printResults.kitchen.error}`, 'server');
        }
        
        if (printResults.records.success) {
          log(`Records copy printed successfully for order #${completedOrder.id}`, 'server');
        } else {
          log(`Failed to print records copy for order #${completedOrder.id}: ${printResults.records.error}`, 'server');
        }
        
      } catch (printError) {
        log(`Failed to print receipts for order #${completedOrder.id}: ${printError}`, 'server');
      }
      
      // Notify kitchen about new order
      notifyKitchen({
        type: 'newOrder',
        order: completedOrder
      });
      
      res.status(201).json(completedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // ShipDay webhook for delivery status updates
  app.post("/api/shipday-webhook", async (req, res) => {
    try {
      const payload = req.body;
      
      // Handle ShipDay webhook
      await shipdayService.handleWebhook(payload);
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Process refund for an order
  app.post("/api/admin/orders/:orderId/refund", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const orderId = parseInt(req.params.orderId);
      const { amount, reason } = req.body;

      // Get the order with payment information
      const order = await storage.getOrderWithItems(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!order.paymentIntentId) {
        return res.status(400).json({ message: "Order has no payment to refund" });
      }

      // Calculate refund amount (default to full amount if not specified)
      const refundAmount = amount ? Math.round(amount * 100) : Math.round(parseFloat(order.total) * 100);

      // Create refund through Stripe
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount: refundAmount,
        reason: reason || 'requested_by_customer',
        metadata: {
          orderId: orderId.toString(),
          refundedBy: req.user.id.toString()
        }
      });

      // Update order status and add refund information
      await storage.updateOrderRefund(orderId, {
        refundId: refund.id,
        refundAmount: refundAmount / 100,
        refundReason: reason || 'requested_by_customer',
        refundedBy: req.user.id,
        refundedAt: new Date()
      });

      // Update order status to cancelled if full refund
      if (refundAmount >= Math.round(parseFloat(order.total) * 100)) {
        await storage.updateOrderStatus(orderId, 'cancelled');
      }

      res.json({
        success: true,
        refund: {
          id: refund.id,
          amount: refundAmount / 100,
          status: refund.status
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe webhook for payment completion
  app.post("/api/webhook", async (req, res) => {
    const payload = req.body;

    try {
      // Handle the event
      switch (payload.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = payload.data.object;
          
          // Update the order payment status
          if (paymentIntent.metadata.orderId) {
            const orderId = parseInt(paymentIntent.metadata.orderId);
            await storage.updateOrderPaymentStatus(orderId, "paid");
            
            // Notify kitchen about payment completion
            const updatedOrder = await storage.getOrderWithItems(orderId);
            notifyKitchen({
              type: 'paymentCompleted',
              order: updatedOrder
            });
          }
          break;
        default:
          console.log(`Unhandled event type ${payload.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rewards API
  app.get("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const rewards = await storage.getRewardsByUserId(req.user.id);
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rewards/spin", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Simulate spinning the wheel to get a random reward
      const allRewards = await storage.getAllRewards();
      
      if (allRewards.length === 0) {
        return res.status(404).json({ message: "No rewards available" });
      }
      
      // Get a random reward
      const randomIndex = Math.floor(Math.random() * allRewards.length);
      const randomReward = allRewards[randomIndex];
      
      // Assign the reward to the user
      const userRewardData = {
        userId: req.user.id,
        rewardId: randomReward.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiration
      };
      
      const validatedData = insertUserRewardSchema.parse(userRewardData);
      const userReward = await storage.createUserReward(validatedData);
      
      res.json({
        userReward,
        reward: randomReward
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to spin reward wheel" });
    }
  });

  // Test route to verify API is working
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // Promo Code Validation
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Promo code is required" });
      }

      // Get promo code from database
      const promoCode = await storage.getPromoCodeByCode(code);

      if (!promoCode) {
        return res.status(404).json({ message: "Invalid promo code" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ message: "Promo code is inactive" });
      }

      if (promoCode.currentUses >= promoCode.maxUses) {
        return res.status(400).json({ message: "Promo code usage limit reached" });
      }

      if (new Date() > promoCode.endDate) {
        return res.status(400).json({ message: "Promo code has expired" });
      }

      res.json({
        code: promoCode.code,
        discount: Number(promoCode.discount),
        discountType: promoCode.discountType,
        minOrderAmount: Number(promoCode.minOrderAmount)
      });
    } catch (error: any) {
      console.error("Promo code validation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Promo Code Management API
  app.get("/api/promo-codes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/promo-codes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      console.log("Received promo code data:", req.body);
      console.log("Request headers:", req.headers);
      console.log("User authenticated:", req.isAuthenticated());
      console.log("User is admin:", req.user?.isAdmin);
      
      const validatedData = insertPromoCodeSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const promoCode = await storage.createPromoCode(validatedData);
      console.log("Created promo code:", promoCode);
      res.status(201).json(promoCode);
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", error.errors);
        const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        console.error("Formatted error message:", errorMessage);
        return res.status(400).json({ 
          message: errorMessage
        });
      }
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create promo code" });
    }
  });

  app.put("/api/promo-codes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPromoCodeSchema.partial().parse(req.body);
      const promoCode = await storage.updatePromoCode(id, validatedData);
      
      if (!promoCode) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      
      res.json(promoCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ 
          message: error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
        });
      }
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update promo code" });
    }
  });

  app.delete("/api/promo-codes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePromoCode(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      
      res.json({ message: "Promo code deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rewards/apply", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { userRewardId, orderId } = req.body;
      
      const userReward = await storage.getUserReward(userRewardId);
      
      if (!userReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      if (userReward.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (userReward.isUsed) {
        return res.status(400).json({ message: "Reward already used" });
      }
      
      // Apply the reward to the order
      const reward = await storage.getReward(userReward.rewardId);
      const order = await storage.getOrder(orderId);
      
      if (!reward || !order) {
        return res.status(404).json({ message: "Reward or order not found" });
      }
      
      // Calculate the discount
      let discountAmount = 0;
      
      if (reward.discountType === "percentage") {
        discountAmount = parseFloat(order.total.toString()) * (parseFloat(reward.discount.toString()) / 100);
      } else {
        discountAmount = parseFloat(reward.discount.toString());
      }
      
      // Apply minimum order amount check if applicable
      if (reward.minOrderAmount && parseFloat(order.total.toString()) < parseFloat(reward.minOrderAmount.toString())) {
        return res.status(400).json({
          message: `Order total must be at least $${reward.minOrderAmount} to use this reward`
        });
      }
      
      // Update the order total with the discount
      const newTotal = parseFloat(order.total.toString()) - discountAmount;
      
      await storage.updateOrderTotal(orderId, newTotal);
      
      // Mark the reward as used
      await storage.useUserReward(userRewardId);
      
      const updatedOrder = await storage.getOrder(orderId);
      
      res.json({
        order: updatedOrder,
        discount: discountAmount
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Setup initial data (for development)
  if (process.env.NODE_ENV === 'development') {
    setupInitialData();
  }

  // ===== GLORIAFOODS-STYLE COMPREHENSIVE API ENDPOINTS =====
  
  // Printer Management API
  app.get("/api/printer/status", async (req, res) => {
    try {
      // Get primary printer configuration from database
      const primaryPrinter = await storage.getPrimaryPrinterConfig();
      
      if (primaryPrinter) {
        res.json({ 
          connected: primaryPrinter.connectionStatus === 'connected', 
          ip: primaryPrinter.ipAddress,
          port: primaryPrinter.port,
          name: primaryPrinter.name,
          status: primaryPrinter.connectionStatus,
          lastConnected: primaryPrinter.lastConnected,
          lastError: primaryPrinter.lastError
        });
      } else {
        // Fallback to environment variable
        res.json({ 
          connected: process.env.PRINTER_IP ? true : false, 
          ip: process.env.PRINTER_IP || null,
          status: 'unknown',
          fallback: true
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/printer/test", async (req, res) => {
    try {
      const result = await testPrimaryPrinter();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/printer/connect", async (req, res) => {
    try {
      const { port, baudRate } = req.body;
      const success = await printer.connect();
      res.json({ success, message: success ? 'Printer connected' : 'Printer connection failed' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // New Receipt Type Routes
  app.post("/api/print/customer", async (req, res) => {
    try {
      const { printerIp, orderData } = req.body;
      
      if (!printerIp || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp and orderData" 
        });
      }

      const result = await printCustomerReceipt(printerIp, orderData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Internal server error", 
        error: error.message 
      });
    }
  });

  app.post("/api/print/kitchen", async (req, res) => {
    try {
      const { printerIp, orderData } = req.body;
      
      if (!printerIp || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp and orderData" 
        });
      }

      const result = await printKitchenTicket(printerIp, orderData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Internal server error", 
        error: error.message 
      });
    }
  });

  app.post("/api/print/records", async (req, res) => {
    try {
      const { printerIp, orderData } = req.body;
      
      if (!printerIp || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp and orderData" 
        });
      }

      const result = await printRecordsCopy(printerIp, orderData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Internal server error", 
        error: error.message 
      });
    }
  });

  app.post("/api/print/all", async (req, res) => {
    try {
      const { printerIp, orderData } = req.body;
      
      if (!printerIp || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: printerIp and orderData" 
        });
      }

      const results = await printAllReceipts(printerIp, orderData);
      res.json({
        success: results.customer.success && results.kitchen.success && results.records.success,
        message: "Print job completed",
        results: results
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Internal server error", 
        error: error.message 
      });
    }
  });

  // Printer Configuration Management API
  app.get("/api/printer/config", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const printers = await storage.getAllPrinterConfigs();
      res.json(printers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/printer/config/primary", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const primaryPrinter = await storage.getPrimaryPrinterConfig();
      res.json(primaryPrinter || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/printer/config", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const { name, ipAddress, port, printerType, isActive, isPrimary, settings } = req.body;
      
      // Validate required fields
      if (!name || !ipAddress) {
        return res.status(400).json({ message: "Missing required fields: name and ipAddress" });
      }

      // Validate IP address format
      if (!ipAddress.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) && !ipAddress.match(/^localhost$/)) {
        return res.status(400).json({ message: "Invalid IP address format. Must be IPv4 (e.g., 192.168.1.100) or 'localhost'" });
      }

      // Validate port if provided
      if (port && (port < 1 || port > 65535)) {
        return res.status(400).json({ message: "Port must be between 1 and 65535" });
      }

      const printerConfig = {
        name,
        ipAddress,
        port: port || 80,
        printerType: printerType || 'epson_tm_m32',
        isActive: isActive !== undefined ? isActive : true,
        isPrimary: isPrimary !== undefined ? isPrimary : false,
        settings: settings || {},
        createdBy: req.user.id
      };

      const newPrinter = await storage.createPrinterConfig(printerConfig);

      // If this is set as primary, update other printers
      if (isPrimary) {
        await storage.setPrimaryPrinter(newPrinter.id);
      }

      res.status(201).json(newPrinter);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/printer/config/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const printerId = parseInt(req.params.id);
      const { name, ipAddress, port, printerType, isActive, isPrimary, settings } = req.body;

      // Validate IP address format if provided
      if (ipAddress && !ipAddress.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) && !ipAddress.match(/^localhost$/)) {
        return res.status(400).json({ message: "Invalid IP address format. Must be IPv4 (e.g., 192.168.1.100) or 'localhost'" });
      }

      // Validate port if provided
      if (port && (port < 1 || port > 65535)) {
        return res.status(400).json({ message: "Port must be between 1 and 65535" });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
      if (port !== undefined) updateData.port = port;
      if (printerType !== undefined) updateData.printerType = printerType;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (settings !== undefined) updateData.settings = settings;

      const updatedPrinter = await storage.updatePrinterConfig(printerId, updateData);
      
      if (!updatedPrinter) {
        return res.status(404).json({ message: "Printer configuration not found" });
      }

      // Handle primary printer change
      if (isPrimary !== undefined && isPrimary) {
        await storage.setPrimaryPrinter(printerId);
        // Re-fetch to get updated isPrimary status
        const refreshedPrinter = await storage.getPrinterConfig(printerId);
        res.json(refreshedPrinter);
      } else {
        res.json(updatedPrinter);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/printer/config/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const printerId = parseInt(req.params.id);
      const deleted = await storage.deletePrinterConfig(printerId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Printer configuration not found or cannot be deleted" });
      }
      
      res.json({ message: "Printer configuration deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/printer/config/:id/test-connection", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const printerId = parseInt(req.params.id);
      const printerConfig = await storage.getPrinterConfig(printerId);
      
      if (!printerConfig) {
        return res.status(404).json({ message: "Printer configuration not found" });
      }

      // Construct printer IP with port
      const printerAddress = printerConfig.port === 80 ? 
        printerConfig.ipAddress : 
        `${printerConfig.ipAddress}:${printerConfig.port}`;

      // Test connection
      const testResult = await testPrinter(printerAddress);
      
      // Update connection status in database
      const connectionStatus = testResult.success ? 'connected' : 'error';
      const errorMessage = testResult.success ? undefined : testResult.error;
      
      await storage.updatePrinterConnectionStatus(printerId, connectionStatus, errorMessage);

      res.json({
        success: testResult.success,
        message: testResult.message,
        connectionTest: testResult,
        printerInfo: {
          id: printerConfig.id,
          name: printerConfig.name,
          ipAddress: printerConfig.ipAddress,
          port: printerConfig.port,
          connectionStatus
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/printer/config/:id/set-primary", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const printerId = parseInt(req.params.id);
      const success = await storage.setPrimaryPrinter(printerId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to set printer as primary" });
      }
      
      const updatedPrinter = await storage.getPrinterConfig(printerId);
      res.json({ 
        message: "Primary printer updated successfully",
        printer: updatedPrinter
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Printer Discovery API
  app.get("/api/printer/discover", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }
    
    try {
      const foundPrinters = await discoverNetworkPrinters();
      res.json({ 
        message: "Printer discovery completed",
        printers: foundPrinters
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Template Editor API Routes
  app.get("/api/admin/receipt-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // For now, return default templates - in production you'd load from database
      const templates = [
        {
          id: 'customer',
          name: 'Customer Receipt',
          description: 'Receipt given to customer with order details and pickup info',
          template: storage.getReceiptTemplate('customer') || getDefaultCustomerTemplate(),
          variables: ['orderNumber', 'orderTime', 'customerName', 'estimatedReadyTime', 'orderType', 'items', 'total', 'paymentMethod', 'isPickup', 'isDelivery']
        },
        {
          id: 'kitchen',
          name: 'Kitchen Ticket',
          description: 'Ticket for kitchen staff with prep instructions (no prices)',
          template: storage.getReceiptTemplate('kitchen') || getDefaultKitchenTemplate(),
          variables: ['orderNumber', 'orderTime', 'customerName', 'orderType', 'deliveryAddress', 'items', 'estimatedReadyTime', 'isPickup', 'isDelivery']
        },
        {
          id: 'records',
          name: 'Records Copy',
          description: 'Complete transaction record for business accounting',
          template: storage.getReceiptTemplate('records') || getDefaultRecordsTemplate(),
          variables: ['orderNumber', 'orderTime', 'orderType', 'staffMember', 'customerName', 'customerPhone', 'customerEmail', 'deliveryAddress', 'items', 'total', 'paymentMethod']
        }
      ];
      
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/receipt-templates", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { templates } = req.body;
      
      // Save templates - in production you'd save to database
      for (const template of templates) {
        await storage.saveReceiptTemplate(template.id, template.template);
      }
      
      res.json({ success: true, message: "Templates saved successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/test-receipt", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { templateId, template } = req.body;
      const printerIp = process.env.PRINTER_IP || "localhost:8080";
      
      // Create sample order data for testing
      const sampleOrderData = {
        orderNumber: 'TEST-' + Date.now(),
        items: [
          { 
            name: 'Margherita Pizza 12"', 
            quantity: 1, 
            price: 14.99,
            modifications: ['Extra cheese'],
            specialInstructions: 'Well done'
          },
          { 
            name: 'Garlic Bread', 
            quantity: 2, 
            price: 4.50,
            modifications: [],
            specialInstructions: ''
          }
        ],
        total: 23.99,
        customerName: 'Test Customer',
        customerPhone: '(828) 555-1234',
        customerEmail: 'test@example.com',
        orderTime: new Date().toISOString(),
        orderType: 'pickup',
        deliveryAddress: '',
        paymentMethod: 'card',
        staffMember: 'Admin',
        estimatedReadyTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString()
      };

      // Process template and print
      const processedContent = processTemplate(template, sampleOrderData);
      
      const result = await sendToPrinter({
        printerIp,
        text: processedContent,
        fontSize: 'normal',
        alignment: 'left',
        cut: true
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Test print failed", 
        error: error.message 
      });
    }
  });

  // Advanced Order Management
  // Cache for analytics to avoid repeated heavy queries
  let analyticsCache: { data: any; timestamp: number } | null = null;
  const ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  app.get("/api/orders/analytics", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Check cache first
      const now = Date.now();
      if (analyticsCache && (now - analyticsCache.timestamp) < ANALYTICS_CACHE_TTL) {
        return res.json(analyticsCache.data);
      }

      const { startDate, endDate } = req.query;
      
      // Use direct database query with explicit select to avoid column issues
      let ordersData;
      try {
        ordersData = await db.select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          orderType: orders.orderType,
          createdAt: orders.createdAt,
          paymentStatus: orders.paymentStatus
        }).from(orders);
      } catch (dbError: any) {
        log(`Database query failed: ${dbError.message}`, 'server');
        // Fallback to storage method
        ordersData = await storage.getAllOrders();
      }
      
      // Filter by date range if provided
      let filteredOrders = ordersData;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredOrders = ordersData.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= start && orderDate <= end;
        });
      }

      // Calculate analytics
      const totalOrders = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const statusCounts = filteredOrders.reduce((counts: any, order: any) => {
        counts[order.status] = (counts[order.status] || 0) + 1;
        return counts;
      }, {});

      const orderTypeCounts = filteredOrders.reduce((counts: any, order: any) => {
        counts[order.orderType] = (counts[order.orderType] || 0) + 1;
        return counts;
      }, {});

      // Get top selling items - this requires getting all order items
      let topSellingItems = [];
      try {
        const allOrderItems = await storage.getAllOrderItems();
        const itemSales = allOrderItems.reduce((items: any, orderItem: any) => {
          const itemName = orderItem.name || `Item ${orderItem.menuItemId}`;
          if (!items[itemName]) {
            items[itemName] = { name: itemName, sales: 0, revenue: 0 };
          }
          items[itemName].sales += orderItem.quantity;
          items[itemName].revenue += parseFloat(orderItem.price) * orderItem.quantity;
          return items;
        }, {});
        
        topSellingItems = Object.values(itemSales)
          .sort((a: any, b: any) => b.sales - a.sales)
          .slice(0, 5);
      } catch (error) {
        log(`Failed to get top selling items: ${error}`, 'server');
      }

      // Calculate customer insights
      const uniqueCustomers = new Set(filteredOrders.map((order: any) => order.userId));
      const customerOrderCounts = filteredOrders.reduce((counts: any, order: any) => {
        counts[order.userId] = (counts[order.userId] || 0) + 1;
        return counts;
      }, {});
      
      const repeatCustomers = Object.values(customerOrderCounts).filter((count: any) => count > 1).length;
      const repeatCustomerPercentage = uniqueCustomers.size > 0 ? (repeatCustomers / uniqueCustomers.size) * 100 : 0;
      const avgOrdersPerCustomer = uniqueCustomers.size > 0 ? totalOrders / uniqueCustomers.size : 0;

      const analyticsData = {
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        averageOrderValue: averageOrderValue.toFixed(2),
        statusCounts,
        orderTypeCounts,
        topSellingItems,
        customerInsights: {
          totalCustomers: uniqueCustomers.size,
          repeatCustomers,
          repeatCustomerPercentage: repeatCustomerPercentage.toFixed(1),
          avgOrdersPerCustomer: avgOrdersPerCustomer.toFixed(1)
        },
        orders: filteredOrders
      };

      // Cache the result
      analyticsCache = { data: analyticsData, timestamp: now };
      
      res.json(analyticsData);
    } catch (error: any) {
      log(`Analytics query error: ${error.message}`, 'server');
      
      // Return default analytics data if query fails
      res.json({
        totalOrders: 0,
        totalRevenue: "0.00",
        averageOrderValue: "0.00",
        statusCounts: {},
        orderTypeCounts: {},
        topSellingItems: [],
        customerInsights: {
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatCustomerPercentage: "0.0",
          avgOrdersPerCustomer: "0.0"
        },
        orders: []
      });
    }
  });

  // Order Status Management
  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      await storage.updateOrderStatus(orderId, status);
      const updatedOrder = await storage.getOrderWithItems(orderId);
      
      // Print receipt when order is completed
      if (status === 'completed') {
        try {
          await printer.printOrder(updatedOrder);
        } catch (printError) {
          log(`Failed to print receipt for order #${orderId}: ${printError}`, 'server');
        }
      }
      
      // Notify kitchen about status change
      notifyKitchen({
        type: 'orderStatusChanged',
        order: updatedOrder
      });
      
      // Notify customer about status change via WebSocket
      if (updatedOrder.userId) {
        notifyCustomer(updatedOrder.userId, {
          type: 'orderStatusChanged',
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          order: updatedOrder
        });
      }
      
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Management API
  app.post("/api/menu/bulk", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { items } = req.body;
      const createdItems = [];
      
      for (const item of items) {
        const validatedData = insertMenuItemSchema.parse(item);
        const menuItem = await storage.createMenuItem(validatedData);
        createdItems.push(menuItem);
      }
      
      res.status(201).json(createdItems);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu items" });
    }
  });

  app.put("/api/menu/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, validatedData);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // PATCH endpoint for partial menu item updates (e.g., featured status)
  app.patch("/api/menu/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, validatedData);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to patch menu item" });
    }
  });

  app.delete("/api/menu/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      
      // Check if there are any orders using this menu item
      const orders = await storage.getAllOrders();
      const ordersUsingMenuItem = orders.filter((order: any) => {
        // This is a simplified check - in a real app you'd query order items directly
        return order.items && order.items.some((item: any) => item.menuItemId === id);
      });
      
      if (ordersUsingMenuItem.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete menu item. It is being used in existing orders. Consider marking it as unavailable instead.",
          ordersCount: ordersUsingMenuItem.length
        });
      }
      
      await storage.deleteMenuItem(id);
      res.json({ message: "Menu item deleted successfully" });
    } catch (error: any) {
      // Check if it's a foreign key constraint error
      if (error.message && error.message.includes("foreign key constraint")) {
        return res.status(400).json({ 
          message: "Cannot delete menu item. It is being used in existing orders. Consider marking it as unavailable instead."
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Choice Groups API Routes
  app.get("/api/choice-groups", async (req, res) => {
    try {
      const choiceGroups = await storage.getAllChoiceGroups();
      res.json(choiceGroups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/choice-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const choiceGroup = await storage.getChoiceGroup(id);
      
      if (!choiceGroup) {
        return res.status(404).json({ message: "Choice group not found" });
      }
      
      res.json(choiceGroup);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/choice-groups", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertChoiceGroupSchema.parse(req.body);
      const choiceGroup = await storage.createChoiceGroup(validatedData);
      res.status(201).json(choiceGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create choice group" });
    }
  });

  app.put("/api/choice-groups/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertChoiceGroupSchema.partial().parse(req.body);
      const choiceGroup = await storage.updateChoiceGroup(id, validatedData);
      
      if (!choiceGroup) {
        return res.status(404).json({ message: "Choice group not found" });
      }
      
      res.json(choiceGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update choice group" });
    }
  });

  app.delete("/api/choice-groups/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChoiceGroup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Choice group not found" });
      }
      
      res.json({ message: "Choice group deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Choice Items API Routes
  app.get("/api/choice-items", async (req, res) => {
    try {
      const choiceItems = await storage.getAllChoiceItems();
      res.json(choiceItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/choice-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const choiceItem = await storage.getChoiceItem(id);
      
      if (!choiceItem) {
        return res.status(404).json({ message: "Choice item not found" });
      }
      
      res.json(choiceItem);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/choice-items", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertChoiceItemSchema.parse(req.body);
      const choiceItem = await storage.createChoiceItem(validatedData);
      res.status(201).json(choiceItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create choice item" });
    }
  });

  app.put("/api/choice-items/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertChoiceItemSchema.partial().parse(req.body);
      const choiceItem = await storage.updateChoiceItem(id, validatedData);
      
      if (!choiceItem) {
        return res.status(404).json({ message: "Choice item not found" });
      }
      
      res.json(choiceItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update choice item" });
    }
  });

  app.delete("/api/choice-items/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChoiceItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Choice item not found" });
      }
      
      res.json({ message: "Choice item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Item Choice Groups API Routes
  app.get("/api/menu-item-choice-groups", async (req, res) => {
    try {
      const menuItemChoiceGroups = await storage.getAllMenuItemChoiceGroups();
      res.json(menuItemChoiceGroups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-item-choice-groups", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertMenuItemChoiceGroupSchema.parse(req.body);
      const menuItemChoiceGroup = await storage.createMenuItemChoiceGroup(validatedData);
      res.status(201).json(menuItemChoiceGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create menu item choice group" });
    }
  });

  app.delete("/api/menu-item-choice-groups/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMenuItemChoiceGroup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Menu item choice group not found" });
      }
      
      res.json({ message: "Menu item choice group deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Category Choice Groups API Routes
  app.get("/api/category-choice-groups", async (req, res) => {
    try {
      log("Fetching all category choice groups...", "server");
      const categoryChoiceGroups = await storage.getAllCategoryChoiceGroups();
      log(`Found ${categoryChoiceGroups.length} category choice groups`, "server");
      res.json(categoryChoiceGroups);
    } catch (error: any) {
      log(`Error fetching category choice groups: ${error.message}`, "server");
      log(`Full error: ${JSON.stringify(error)}`, "server");
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/category-choice-groups", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      log(`Creating category choice group with data: ${JSON.stringify(req.body)}`, "server");
      const validatedData = insertCategoryChoiceGroupSchema.parse(req.body);
      log(`Validated data: ${JSON.stringify(validatedData)}`, "server");
      const categoryChoiceGroup = await storage.createCategoryChoiceGroup(validatedData);
      log(`Created category choice group: ${JSON.stringify(categoryChoiceGroup)}`, "server");
      res.status(201).json(categoryChoiceGroup);
    } catch (error) {
      log(`Error creating category choice group: ${error instanceof Error ? error.message : error}`, "server");
      log(`Full error: ${JSON.stringify(error)}`, "server");
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create category choice group" });
    }
  });

  app.delete("/api/category-choice-groups/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategoryChoiceGroup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Category choice group not found" });
      }
      
      res.json({ message: "Category choice group deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tax Categories API Routes
  app.get("/api/tax-categories", async (req, res) => {
    try {
      const taxCategories = await storage.getAllTaxCategories();
      res.json(taxCategories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tax-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taxCategory = await storage.getTaxCategory(id);
      
      if (!taxCategory) {
        return res.status(404).json({ message: "Tax category not found" });
      }
      
      res.json(taxCategory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tax-categories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertTaxCategorySchema.parse(req.body);
      const taxCategory = await storage.createTaxCategory(validatedData);
      res.status(201).json(taxCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create tax category" });
    }
  });

  app.put("/api/tax-categories/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTaxCategorySchema.partial().parse(req.body);
      const taxCategory = await storage.updateTaxCategory(id, validatedData);
      
      if (!taxCategory) {
        return res.status(404).json({ message: "Tax category not found" });
      }
      
      res.json(taxCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update tax category" });
    }
  });

  app.delete("/api/tax-categories/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTaxCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tax category not found" });
      }
      
      res.json({ message: "Tax category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tax Settings API Routes
  app.get("/api/tax-settings", async (req, res) => {
    try {
      const taxSettings = await storage.getTaxSettings();
      res.json(taxSettings || {
        taxApplication: "on_top",
        taxName: "Sales Tax",
        deliveryFeeTaxRate: "0",
        tipsTaxRate: "0",
        serviceFeeTaxRate: "4.75",
        currency: "USD",
        currencySymbol: "$",
        currencyPosition: "before",
        decimalPlaces: 2
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/tax-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertTaxSettingsSchema.partial().parse(req.body);
      const taxSettings = await storage.updateTaxSettings(validatedData);
      
      if (!taxSettings) {
        return res.status(500).json({ message: "Failed to update tax settings" });
      }
      
      res.json(taxSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update tax settings" });
    }
  });

  // Pause Services API Routes
  app.get("/api/pause-services", async (req, res) => {
    try {
      const pauseServices = await storage.getAllPauseServices();
      res.json(pauseServices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pause-services/active", async (req, res) => {
    try {
      const activePauseServices = await storage.getActivePauseServices();
      res.json(activePauseServices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pause-services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pauseService = await storage.getPauseService(id);
      
      if (!pauseService) {
        return res.status(404).json({ message: "Pause service not found" });
      }
      
      res.json(pauseService);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/pause-services", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertPauseServiceSchema.parse(req.body);
      const pauseService = await storage.createPauseService({
        ...validatedData,
        createdBy: req.user.id
      });
      res.status(201).json(pauseService);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create pause service" });
    }
  });

  app.put("/api/pause-services/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPauseServiceSchema.partial().parse(req.body);
      const pauseService = await storage.updatePauseService(id, validatedData);
      
      if (!pauseService) {
        return res.status(404).json({ message: "Pause service not found" });
      }
      
      res.json(pauseService);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update pause service" });
    }
  });

  app.delete("/api/pause-services/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePauseService(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pause service not found" });
      }
      
      res.json({ message: "Pause service deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Management API
  app.get("/api/customers", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const customers = await storage.getAllUsers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id/orders", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const customerId = parseInt(req.params.id);
      const orders = await storage.getOrdersByUser(customerId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Kitchen Display System API

  app.post("/api/kitchen/orders/:id/start", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      await storage.updateOrderStatus(orderId, 'processing');
      const updatedOrder = await storage.getOrderWithItems(orderId);
      
      notifyKitchen({
        type: 'orderStarted',
        order: updatedOrder
      });
      
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/kitchen/orders/:id/complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const orderId = parseInt(req.params.id);
      await storage.updateOrderStatus(orderId, 'completed');
      const updatedOrder = await storage.getOrderWithItems(orderId);
      
      // Award points to user for completed order
      if (updatedOrder.userId) {
        try {
          await storage.awardPointsForOrder(updatedOrder.userId, updatedOrder.id, parseFloat(updatedOrder.total));
        } catch (pointsError: any) {
          log(`Failed to award points for order #${orderId}: ${pointsError.message}`, 'server');
        }
      }
      
      // Distribute tips to clocked-in employees
      if (updatedOrder.tip && parseFloat(updatedOrder.tip) > 0) {
        try {
          await storage.distributeTips(
            updatedOrder.id,
            parseFloat(updatedOrder.tip),
            updatedOrder.orderType
          );
          log(`Tips distributed for order #${orderId}: $${updatedOrder.tip}`, 'server');
        } catch (tipError) {
          log(`Failed to distribute tips for order #${orderId}: ${tipError}`, 'server');
        }
      }
      
      // Print receipt when order is completed
      try {
        await printer.printOrder(updatedOrder);
      } catch (printError) {
        log(`Failed to print receipt for order #${orderId}: ${printError}`, 'server');
      }
      
      notifyKitchen({
        type: 'orderCompleted',
        order: updatedOrder
      });
      
      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rewards & Loyalty API
  app.get("/api/user/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      const userPoints = await storage.getUserPoints(req.user.id);
      
      res.json({
        points: userPoints?.points || 0,
        totalPointsEarned: userPoints?.totalEarned || 0,
        totalPointsRedeemed: userPoints?.totalRedeemed || 0,
        lastEarnedAt: userPoints?.lastEarnedAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rewards", async (req, res) => {
    try {
      const rewards = await storage.getActiveRewards();
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rewards/:id/redeem", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const rewardId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const redemption = await storage.redeemReward(userId, rewardId);
      
      if (!redemption) {
        return res.status(400).json({ message: "Failed to redeem reward. Insufficient points or reward not available." });
      }
      
      res.json({
        success: true,
        redemption,
        reward: redemption.reward,
        message: "Reward redeemed successfully!"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user/redemptions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const redemptions = await storage.getUserRedemptions(req.user.id);
      res.json(redemptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin Rewards Management API
  app.get("/api/admin/rewards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const rewards = await storage.getAllRewards();
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/rewards", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const reward = await storage.createReward(req.body);
      res.status(201).json(reward);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admin/rewards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const reward = await storage.updateReward(id, req.body);
      
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json(reward);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/rewards/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.deleteReward(id);
      res.json({ message: "Reward deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Settings Management API
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Return system settings
      res.json({
        restaurant: {
          name: "Favilla's NY Pizza",
          phone: "(555) 123-4567",
          address: "123 Main St, New York, NY 10001",
          hours: "Mon-Sun: 11AM-11PM"
        },
        printer: printer.getStatus(),
        system: {
          version: "1.0.0",
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { restaurant, printer: printerConfig } = req.body;
      
      // Update printer configuration if provided
      if (printerConfig) {
        // Update printer settings
        log('Printer settings updated', 'server');
      }
      
      res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  async function setupInitialData() {
    try {
      // Check if menu items already exist
      const existingMenuItems = await storage.getAllMenuItems();
      
      if (existingMenuItems.length === 0) {
        // Add sample menu items
        const menuItemsData = [
          {
            name: "BBQ Chicken Pizza",
            description: "Our BBQ Pizza features a tangy barbecue sauce base, topped with grilled chicken, red onions, and a blend of mozzarella and cheddar cheeses.",
            imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "16.49",
            category: "pizza",
            isPopular: true,
            isBestSeller: true,
            options: {
              sizes: [
                { name: "10\"", price: "16.49" },
                { name: "14\"", price: "23.49" },
                { name: "16\"", price: "26.49" },
                { name: "Sicilian", price: "28.99" }
              ]
            }
          },
          {
            name: "Pepperoni Pizza",
            description: "Really An Italian Pepperoni & Cheese Classic. Kids & Adults love it.",
            imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "16.49",
            category: "pizza",
            isPopular: true,
            options: {
              sizes: [
                { name: "10\"", price: "16.49" },
                { name: "14\"", price: "23.49" },
                { name: "16\"", price: "26.49" },
                { name: "Sicilian", price: "28.99" }
              ]
            }
          },
          {
            name: "Spinach Artichoke Grandma Pizza",
            description: "A savory twist on a classic. This square, thick-crust pie is topped with creamy artichoke hearts, fresh spinach, and a rich blend of mozzarella and parmesan cheeses, baked to golden perfection.",
            imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "29.99",
            category: "pizza",
            options: {
              sizes: [
                { name: "Regular", price: "29.99" }
              ]
            }
          },
          {
            name: "Marinara Vodka Pesto Pizza",
            description: "This artisanal pie combines zesty marinara, creamy vodka sauce, and fragrant basil pesto, topped with a generous layer of melted mozzarella. Each slice offers a perfect harmony of tangy, rich, and herbaceous notes, crafted on our signature crust.",
            imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "29.99",
            category: "pizza",
            isNew: true,
            options: {
              sizes: [
                { name: "Regular", price: "29.99" }
              ]
            }
          },
          {
            name: "Grandma Pizza",
            description: "A Sicilian-style classic with a thick, crispy square crust. Topped with our signature marinara sauce, a generous blend of mozzarella, and a sprinkle of fresh herbs, it's baked to golden perfection.",
            imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "22.99",
            category: "pizza",
            isPopular: true,
            options: {
              sizes: [
                { name: "Regular", price: "22.99" }
              ]
            }
          },
          {
            name: "Grandma's Caprese Pizza",
            description: "A fresh take on the classic Sicilian-style square crust. This vibrant pie is topped with creamy fresh mozzarella, ripe tomatoes, fragrant basil, and a drizzle of olive oil and balsamic glaze, finished with a pinch of salt and pepper. Each bite bursts with bright, summery flavors, blending tradition and elegance.",
            imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
            basePrice: "29.99",
            category: "pizza",
            options: {
              sizes: [
                { name: "Regular", price: "29.99" }
              ]
            }
          }
        ];
        
        for (const item of menuItemsData) {
          await storage.createMenuItem(item);
        }
        
        log('Created sample menu items', 'setup');
      }
      
      // Check if rewards already exist
      const existingRewards = await storage.getAllRewards();
      
      if (existingRewards.length === 0) {
        // Add sample rewards
        const rewardsData = [
          {
            name: "10% Off",
            description: "10% off your next order",
            discount: "10",
            discountType: "percentage",
            minOrderAmount: "15"
          },
          {
            name: "Free Garlic Knots",
            description: "Free order of garlic knots with your next purchase",
            discount: "8.99",
            discountType: "fixed",
            minOrderAmount: "20"
          },
          {
            name: "$5 Off",
            description: "$5 off your next order of $30 or more",
            discount: "5",
            discountType: "fixed",
            minOrderAmount: "30"
          },
          {
            name: "Free Delivery",
            description: "Free delivery on your next order",
            discount: "4.99",
            discountType: "fixed",
            minOrderAmount: "25"
          },
          {
            name: "Buy One Get One 50% Off",
            description: "Buy one pizza, get a second pizza of equal or lesser value 50% off",
            discount: "50",
            discountType: "percentage",
            minOrderAmount: "20"
          },
          {
            name: "Free Drink",
            description: "Free 2-liter soda with your next order",
            discount: "3.99",
            discountType: "fixed",
            minOrderAmount: "25"
          },
          {
            name: "15% Off",
            description: "15% off your next order",
            discount: "15",
            discountType: "percentage",
            minOrderAmount: "20"
          },
          {
            name: "Free Dessert",
            description: "Free dessert with your next order",
            discount: "7.99",
            discountType: "fixed",
            minOrderAmount: "35"
          }
        ];
        
        for (const reward of rewardsData) {
          await storage.createReward(reward);
        }
        
        log('Created sample rewards', 'setup');
      }
      
      // Check if users already exist
      const existingUsers = await storage.getAllUsers();
      
      if (existingUsers.length === 0) {
        // Add sample users
        const usersData = [
          {
            username: "superadmin",
            password: "superadmin123",
            email: "superadmin@favillas.com",
            firstName: "Super",
            lastName: "Admin",
            isAdmin: true,
            role: "super_admin",
            isActive: true,
          },
          {
            username: "admin",
            password: "admin123",
            email: "admin@favillas.com",
            firstName: "Admin",
            lastName: "User",
            isAdmin: true,
            role: "admin",
            isActive: true,
          },
          {
            username: "employee",
            password: "employee123",
            email: "employee@favillas.com",
            firstName: "Employee",
            lastName: "User",
            isAdmin: false,
            role: "employee",
            isActive: true,
          },
          {
            username: "customer",
            password: "customer123",
            email: "customer@example.com",
            firstName: "John",
            lastName: "Doe",
            isAdmin: false,
            role: "customer",
            isActive: true,
          }
        ];
        
        for (const user of usersData) {
          await storage.createUser({
            ...user,
            password: await hashPassword(user.password),
          });
        }
        
        log('Created sample users', 'setup');
      }
      
      // Check if promo codes already exist
      const existingPromoCodes = await storage.getAllPromoCodes();
      
      if (existingPromoCodes.length === 0) {
        // Add sample promo codes
        const promoCodesData = [
          {
            code: "FIRST15",
            name: "First Order Discount",
            description: "15% off your first order",
            discount: "15",
            discountType: "percentage",
            minOrderAmount: "20",
            maxUses: 100,
            currentUses: 45,
            isActive: true,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2025-12-30")
          },
          {
            code: "FREEDEL",
            name: "Free Delivery",
            description: "Free delivery on orders over $30",
            discount: "5",
            discountType: "fixed",
            minOrderAmount: "30",
            maxUses: 50,
            currentUses: 23,
            isActive: true,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-06-29")
          },
          {
            code: "WEEKEND10",
            name: "Weekend Special",
            description: "10% off weekend orders",
            discount: "10",
            discountType: "percentage",
            minOrderAmount: "25",
            maxUses: 200,
            currentUses: 12,
            isActive: false,
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-12-30")
          }
        ];
        
        for (const promoCode of promoCodesData) {
          await storage.createPromoCode(promoCode);
        }
        
        log('Created sample promo codes', 'setup');
      }
    } catch (error) {
      log('Error setting up initial data: ' + error, 'setup');
    }
  }

  // Vacation Mode API Routes
  app.get("/api/vacation-mode", async (req, res) => {
    try {
      const vacationMode = await storage.getVacationMode();
      res.json(vacationMode || { isEnabled: false });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/vacation-mode", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { isEnabled, startDate, endDate, message, reason } = req.body;
      
      const updatedVacationMode = await storage.updateVacationMode({
        isEnabled,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        message,
        reason,
        createdBy: req.user.id
      });
      
      res.json(updatedVacationMode);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Store Hours API Routes
  app.get("/api/store-hours", async (req, res) => {
    try {
      const storeHours = await storage.getAllStoreHours();
      res.json(storeHours);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/store-hours/:dayOfWeek", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      const { isOpen, openTime, closeTime, isBreakTime, breakStartTime, breakEndTime } = req.body;
      
      const updatedStoreHours = await storage.updateStoreHours(dayOfWeek, {
        isOpen,
        openTime,
        closeTime,
        isBreakTime,
        breakStartTime,
        breakEndTime
      });
      
      res.json(updatedStoreHours);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Restaurant Settings API Routes
  app.get("/api/restaurant-settings", async (req, res) => {
    try {
      const settings = await storage.getRestaurantSettings();
      res.json(settings || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurant-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const updatedSettings = await storage.updateRestaurantSettings(req.body);
      res.json(updatedSettings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time Tracking Routes
  
  // Employee Clock In
  app.post("/api/time-clock/clock-in", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user;
      
      // Check if employee has an active clock-in
      const activeEntry = await storage.getActiveTimeEntry(user.id);
      if (activeEntry) {
        return res.status(400).json({ 
          message: "You are already clocked in",
          activeEntry 
        });
      }

      // Check for scheduled shift
      const todaysSchedule = await storage.getTodaysSchedule(user.id);
      const currentTime = new Date();
      
      let scheduleAlert = null;
      if (todaysSchedule) {
        const scheduleStart = new Date(`${todaysSchedule.scheduleDate}T${todaysSchedule.startTime}`);
        const timeDiff = (currentTime.getTime() - scheduleStart.getTime()) / (1000 * 60); // minutes
        
        if (timeDiff < -15) {
          // Clocking in more than 15 minutes early
          scheduleAlert = await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'early_clock_in',
            message: `${user.firstName} ${user.lastName} clocked in ${Math.abs(timeDiff).toFixed(0)} minutes early`,
            scheduledShiftId: todaysSchedule.id,
          });
        } else if (timeDiff > 15) {
          // Clocking in more than 15 minutes late
          scheduleAlert = await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'late_clock_in',
            message: `${user.firstName} ${user.lastName} clocked in ${timeDiff.toFixed(0)} minutes late`,
            scheduledShiftId: todaysSchedule.id,
          });
        }
      } else {
        // No scheduled shift - unscheduled clock in
        scheduleAlert = await storage.createScheduleAlert({
          employeeId: user.id,
          alertType: 'unscheduled_clock_in',
          message: `${user.firstName} ${user.lastName} clocked in without a scheduled shift`,
        });
      }

      // Create time entry
      const timeEntry = await storage.createTimeEntry({
        employeeId: user.id,
        clockInTime: currentTime,
        scheduledShiftId: todaysSchedule?.id,
      });

      log(`Employee ${user.firstName} ${user.lastName} clocked in`, "time-tracking");

      res.status(201).json({
        timeEntry,
        schedule: todaysSchedule,
        alert: scheduleAlert,
      });

    } catch (error) {
      log(`Clock in error: ${error instanceof Error ? error.message : error}`, "time-tracking");
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Employee Clock Out
  app.post("/api/time-clock/clock-out", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { timeEntryId, breakDuration, notes } = req.body;
      const user = req.user;

      // Verify the time entry belongs to the user
      const timeEntry = await storage.getTimeEntry(timeEntryId);
      if (!timeEntry || timeEntry.employeeId !== user.id) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      if (timeEntry.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out" });
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(timeEntry.clockInTime);
      
      // Calculate total hours (subtract break time)
      const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
      const totalHours = Math.max(0, (totalMinutes - (breakDuration || 0)) / 60);
      
      // Calculate overtime (over 8 hours)
      const overtimeHours = Math.max(0, totalHours - 8);

      // Update time entry
      const updatedEntry = await storage.updateTimeEntry(timeEntryId, {
        clockOutTime,
        breakDurationMinutes: breakDuration || 0,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        notes,
        status: 'completed',
      });

      // Check for overtime alert
      if (overtimeHours > 0) {
        await storage.createScheduleAlert({
          employeeId: user.id,
          alertType: 'overtime',
          message: `${user.firstName} ${user.lastName} worked ${overtimeHours.toFixed(2)} hours of overtime`,
          timeEntryId: timeEntryId,
        });
      }

      log(`Employee ${user.firstName} ${user.lastName} clocked out - ${totalHours.toFixed(2)} hours`, "time-tracking");

      res.json({
        timeEntry: updatedEntry,
        totalHours: totalHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
      });

    } catch (error) {
      log(`Clock out error: ${error instanceof Error ? error.message : error}`, "time-tracking");
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get Current Clock Status
  app.get("/api/time-clock/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user;
      const activeEntry = await storage.getActiveTimeEntry(user.id);
      const todaysSchedule = await storage.getTodaysSchedule(user.id);

      res.json({
        isClocked: !!activeEntry,
        activeEntry,
        todaysSchedule,
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get clock status" });
    }
  });

  // Get Employee Time Summary
  app.get("/api/time-clock/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { startDate, endDate } = req.query;
      const user = req.user;

      const summary = await storage.getEmployeeTimeSummary(
        user.id, 
        startDate as string, 
        endDate as string
      );

      res.json(summary);

    } catch (error) {
      res.status(500).json({ message: "Failed to get time summary" });
    }
  });

  // Admin: Get All Employee Hours (Pay Period)
  app.get("/api/admin/payroll", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { payPeriodId, startDate, endDate } = req.query;
      
      const payrollData = await storage.getPayrollSummary(
        payPeriodId ? parseInt(payPeriodId as string) : undefined,
        startDate as string,
        endDate as string
      );

      res.json(payrollData);

    } catch (error) {
      res.status(500).json({ message: "Failed to get payroll data" });
    }
  });

  // Admin: Create Employee Schedule
  app.post("/api/admin/schedules", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const scheduleData = req.body;
      
      // Check for scheduling conflicts
      const conflicts = await storage.checkScheduleConflicts(
        scheduleData.employeeId,
        scheduleData.scheduleDate,
        scheduleData.startTime,
        scheduleData.endTime
      );

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          message: "Scheduling conflict detected",
          conflicts 
        });
      }

      const schedule = await storage.createEmployeeSchedule({
        ...scheduleData,
        createdBy: req.user.id,
      });

      log(`Schedule created for employee ${scheduleData.employeeId}`, "scheduling");

      res.status(201).json(schedule);

    } catch (error) {
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // Admin: Get All Schedules
  app.get("/api/admin/schedules", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { startDate, endDate, employeeId } = req.query;
      
      const schedules = await storage.getEmployeeSchedules(
        startDate as string,
        endDate as string,
        employeeId ? parseInt(employeeId as string) : undefined
      );

      res.json(schedules);

    } catch (error) {
      res.status(500).json({ message: "Failed to get schedules" });
    }
  });

  // Admin: Get Schedule Alerts
  app.get("/api/admin/alerts", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { unreadOnly } = req.query;
      
      const alerts = await storage.getScheduleAlerts(unreadOnly === 'true');

      res.json(alerts);

    } catch (error) {
      res.status(500).json({ message: "Failed to get alerts" });
    }
  });

  // Admin: Mark Alert as Read
  app.patch("/api/admin/alerts/:id/read", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const alertId = parseInt(req.params.id);
      await storage.markAlertAsRead(alertId);
      res.json({ message: "Alert marked as read" });

    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Admin: Get Tip Settings
  app.get("/api/admin/tip-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const tipSettings = await storage.getTipSettings();
      res.json(tipSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tip settings" });
    }
  });

  // Admin: Update Tip Settings
  app.put("/api/admin/tip-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const updatedSettings = await storage.updateTipSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update tip settings" });
    }
  });

  // Admin: Get Tip Distributions
  app.get("/api/admin/tip-distributions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { startDate, endDate, orderId } = req.query;
      
      let query = `
        SELECT td.*, u.first_name, u.last_name, u.username, o.id as order_number, o.created_at as order_date
        FROM tip_distributions td
        JOIN users u ON td.employee_id = u.id
        JOIN orders o ON td.order_id = o.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (startDate) {
        query += ` AND td.distribution_date >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND td.distribution_date <= $${params.length + 1}`;
        params.push(endDate);
      }
      if (orderId) {
        query += ` AND td.order_id = $${params.length + 1}`;
        params.push(parseInt(orderId as string));
      }

      query += ` ORDER BY td.distribution_date DESC`;

      const result = await db.execute(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tip distributions" });
    }
  });

  // System Settings API endpoints
  app.get("/api/admin/system-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { category } = req.query;
      let settings;
      
      if (category) {
        settings = await storage.getSystemSettingsByCategory(category as string);
      } else {
        settings = await storage.getAllSystemSettings();
      }

      // Group settings by category for easier frontend consumption
      const groupedSettings: Record<string, any[]> = {};
      settings.forEach(setting => {
        if (!groupedSettings[setting.category]) {
          groupedSettings[setting.category] = [];
        }
        
        // Hide sensitive values for security
        if (setting.is_sensitive && setting.setting_value) {
          setting.setting_value = '***';
        }
        
        groupedSettings[setting.category].push(setting);
      });

      res.json(groupedSettings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post("/api/admin/system-settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { settings } = req.body;
      
      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({ message: "Invalid settings data" });
      }

      const updatedSettings = [];
      
      for (const setting of settings) {
        const { setting_key, setting_value } = setting;
        
        if (!setting_key) {
          continue;
        }

        // Validate setting value based on type and pattern
        const existingSetting = await storage.getSystemSetting(setting_key);
        if (existingSetting) {
          // Validate pattern if specified
          if (existingSetting.validation_pattern) {
            const pattern = new RegExp(existingSetting.validation_pattern);
            if (!pattern.test(setting_value)) {
              return res.status(400).json({ 
                message: `Invalid value for ${existingSetting.display_name}. Please check the format.` 
              });
            }
          }

          const updated = await storage.updateSystemSetting(setting_key, setting_value);
          if (updated) {
            updatedSettings.push(updated);
          }
        }
      }

      res.json({ 
        message: "Settings updated successfully", 
        updatedSettings 
      });
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  app.get("/api/admin/system-settings/:key", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }

      // Hide sensitive values
      if (setting.is_sensitive && setting.setting_value) {
        setting.setting_value = '***';
      }

      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  });

  // ShipDay webhook endpoint
  app.post("/api/shipday/webhook", express.json(), async (req, res) => {
    try {
      log(`ShipDay webhook received: ${JSON.stringify(req.body)}`, 'ShipDay');
      
      // Validate webhook token if configured
      const webhookToken = process.env.SHIPDAY_WEBHOOK_TOKEN;
      if (webhookToken) {
        const providedToken = req.headers['x-shipday-token'] || req.headers['authorization']?.replace('Bearer ', '');
        if (!providedToken || providedToken !== webhookToken) {
          log('ShipDay webhook rejected: invalid or missing token', 'ShipDay');
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }
      
      // Handle different webhook events
      const { event_type, order_id, status, tracking_info } = req.body;
      
      if (event_type === 'order_status_updated' && order_id) {
        // Extract our internal order ID from ShipDay order ID (format: FAV-123)
        const internalOrderId = order_id.replace('FAV-', '');
        
        if (internalOrderId && !isNaN(parseInt(internalOrderId))) {
          // Update order status in database
          try {
            await storage.updateOrder(parseInt(internalOrderId), {
              shipdayStatus: status,
              ...(tracking_info && { trackingInfo: JSON.stringify(tracking_info) })
            });
            
            log(`Updated order #${internalOrderId} status to: ${status}`, 'ShipDay');
          } catch (updateError: any) {
            log(`Failed to update order #${internalOrderId}: ${updateError.message}`, 'ShipDay');
          }
        }
      }
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      log(`ShipDay webhook error: ${error.message}`, 'ShipDay');
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
