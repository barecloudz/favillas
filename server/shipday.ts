import { log } from "./vite";

interface ShipDayAddress {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

interface ShipDayOrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: ShipDayAddress;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  specialInstructions?: string;
  restaurantName: string;
  restaurantPhone: string;
  restaurantAddress: string;
  fulfillmentTime?: string; // "asap" or "scheduled"
  scheduledTime?: string; // ISO date string for scheduled deliveries
}

interface ShipDayResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
}

interface ShipDayOrderStatus {
  orderId: string;
  orderStatus: string;
  trackingLink?: string;
  estimatedDeliveryTime?: string;
  carrier?: {
    name: string;
    phone?: string;
  };
  lastUpdate?: string;
}

class ShipDayService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SHIPDAY_API_KEY || '';
    this.baseUrl = 'https://api.shipday.com';
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('ShipDay API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Basic ${this.apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    log(`Making ShipDay API request: ${method} ${url}`, 'ShipDay');
    
    try {
      const response = await fetch(url, options);
      
      log(`ShipDay API response status: ${response.status} ${response.statusText}`, 'ShipDay');
      
      const responseText = await response.text();
      log(`ShipDay API response body: ${responseText}`, 'ShipDay');
      
      if (!response.ok) {
        throw new Error(`ShipDay API error: ${response.status} - ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      log(`ShipDay API request failed: ${error}`, 'ShipDay');
      throw error;
    }
  }

  async createDeliveryOrder(orderData: ShipDayOrderData): Promise<ShipDayResponse> {
    try {
      // Use documented ShipDay API format
      const customerName = orderData.customerName && orderData.customerName.trim() !== "" ? orderData.customerName.trim() : "Customer";
      const customerPhone = orderData.customerPhone.replace(/[^\d]/g, ''); // Clean phone number
      const customerEmail = orderData.customerEmail || "";
      const customerAddress = `${orderData.address.street || orderData.address.fullAddress}, ${orderData.address.city}, ${orderData.address.state} ${orderData.address.zipCode}`;

      const shipdayPayload = {
        orderItems: orderData.items.map(item => ({
          name: item.name,
          unitPrice: item.price,
          quantity: item.quantity
        })),
        pickup: {
          address: {
            street: "123 Main St", // Update with actual restaurant address
            city: "Asheville",
            state: "NC",
            zip: "28801",
            country: "United States"
          },
          contactPerson: {
            name: "Favillas NY Pizza", // Ensure proper restaurant name
            phone: "5551234567" // Update with actual restaurant phone
          }
        },
        dropoff: {
          address: {
            street: orderData.address.street || orderData.address.fullAddress,
            city: orderData.address.city,
            state: orderData.address.state,
            zip: orderData.address.zipCode,
            country: "United States"
          },
          contactPerson: {
            name: customerName,
            phone: customerPhone,
            ...(customerEmail && { email: customerEmail })
          }
        },
        orderNumber: orderData.orderId,
        totalOrderCost: orderData.totalAmount,
        paymentMethod: 'credit_card', // Update based on your payment processing
        // Required customer fields at root level
        customerName: customerName,
        customerPhoneNumber: customerPhone,
        customerAddress: customerAddress,
        ...(customerEmail && { customerEmail: customerEmail }),
        // Add scheduling information for ShipDay
        ...(orderData.fulfillmentTime === 'scheduled' && orderData.scheduledTime && (() => {
          const scheduledDate = new Date(orderData.scheduledTime);
          const deliveryDate = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          const deliveryTime = scheduledDate.toTimeString().split(' ')[0]; // HH:MM:SS format

          // Calculate pickup time (30 minutes before delivery for preparation)
          const pickupDate = new Date(scheduledDate.getTime() - 30 * 60 * 1000);
          const pickupTime = pickupDate.toTimeString().split(' ')[0]; // HH:MM:SS format

          return {
            // Use the more direct requestedDeliveryTime ISO format
            requestedDeliveryTime: scheduledDate.toISOString(),
            // Also include the other fields for compatibility
            expectedDeliveryDate: deliveryDate,
            expectedDeliveryTime: deliveryTime,
            expectedPickupTime: pickupTime
          };
        })())
      };

      log(`Sending ShipDay payload: ${JSON.stringify(shipdayPayload, null, 2)}`, 'ShipDay');
      
      const response = await this.makeRequest('/orders', 'POST', shipdayPayload);
      
      log(`ShipDay response: ${JSON.stringify(response, null, 2)}`, 'ShipDay');
      
      if (response.success) {
        log(`ShipDay order created successfully: ${response.orderId}`, 'ShipDay');
        return {
          success: true,
          orderId: response.orderId,
          message: 'Delivery order created successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to create ShipDay order');
      }
    } catch (error: any) {
      log(`Failed to create ShipDay order: ${error.message}`, 'ShipDay');
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrderStatus(shipdayOrderId: string): Promise<ShipDayOrderStatus> {
    try {
      const response = await this.makeRequest(`/orders/${shipdayOrderId}`);

      // Extract relevant tracking information from response
      const orderStatus: ShipDayOrderStatus = {
        orderId: response.orderId || shipdayOrderId,
        orderStatus: response.orderStatus || 'unknown',
        trackingLink: response.trackingLink,
        estimatedDeliveryTime: response.estimatedDeliveryTime,
        carrier: response.carrier ? {
          name: response.carrier.name,
          phone: response.carrier.phone
        } : undefined,
        lastUpdate: new Date().toISOString()
      };

      log(`ShipDay order status for ${shipdayOrderId}: ${orderStatus.orderStatus}`, 'ShipDay');
      return orderStatus;
    } catch (error: any) {
      log(`Failed to get ShipDay order status: ${error.message}`, 'ShipDay');
      throw error;
    }
  }

  // Get detailed tracking information for customer
  async getOrderTracking(orderNumber: string): Promise<{
    status: string;
    statusDisplay: string;
    trackingLink?: string;
    estimatedDelivery?: string;
    carrier?: {
      name: string;
      phone?: string;
    };
    progress: {
      ordered: boolean;
      preparing: boolean;
      pickedUp: boolean;
      onTheWay: boolean;
      delivered: boolean;
    };
  }> {
    try {
      const response = await this.makeRequest(`/orders/${orderNumber}`);

      const status = response.orderStatus || 'unknown';

      // Map ShipDay statuses to customer-friendly display text
      const statusDisplayMap: Record<string, string> = {
        'NOT_ASSIGNED': 'Order Confirmed',
        'NOT_ACCEPTED': 'Finding Driver',
        'NOT_STARTED_YET': 'Driver Assigned',
        'STARTED': 'Driver En Route to Restaurant',
        'PICKED_UP': 'Order Picked Up',
        'READY_TO_DELIVER': 'Out for Delivery',
        'ALREADY_DELIVERED': 'Delivered',
        'INCOMPLETE': 'Delivery Issue',
        'FAILED_DELIVERY': 'Delivery Failed'
      };

      // Track delivery progress
      const progress = {
        ordered: true,
        preparing: ['NOT_ASSIGNED', 'NOT_ACCEPTED', 'NOT_STARTED_YET', 'STARTED', 'PICKED_UP', 'READY_TO_DELIVER', 'ALREADY_DELIVERED'].includes(status),
        pickedUp: ['PICKED_UP', 'READY_TO_DELIVER', 'ALREADY_DELIVERED'].includes(status),
        onTheWay: ['READY_TO_DELIVER', 'ALREADY_DELIVERED'].includes(status),
        delivered: status === 'ALREADY_DELIVERED'
      };

      return {
        status,
        statusDisplay: statusDisplayMap[status] || status,
        trackingLink: response.trackingLink,
        estimatedDelivery: response.estimatedDeliveryTime,
        carrier: response.carrier ? {
          name: response.carrier.name,
          phone: response.carrier.phone
        } : undefined,
        progress
      };
    } catch (error: any) {
      log(`Failed to get order tracking for ${orderNumber}: ${error.message}`, 'ShipDay');
      throw error;
    }
  }

  async updateOrderStatus(shipdayOrderId: string, status: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/orders/${shipdayOrderId}`, 'PUT', {
        status: status
      });
      return response;
    } catch (error: any) {
      log(`Failed to update ShipDay order status: ${error.message}`, 'ShipDay');
      throw error;
    }
  }

  async cancelOrder(shipdayOrderId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/orders/${shipdayOrderId}`, 'PUT', {
        status: 'cancelled'
      });
      return response;
    } catch (error: any) {
      log(`Failed to cancel ShipDay order: ${error.message}`, 'ShipDay');
      throw error;
    }
  }

  // Webhook handler for ShipDay status updates
  async handleWebhook(payload: any): Promise<void> {
    try {
      const { orderId, status, trackingUrl, estimatedDeliveryTime } = payload;
      
      log(`ShipDay webhook received for order ${orderId}: ${status}`, 'ShipDay');
      
      // Here you would update your local order with the ShipDay status
      // This would typically involve updating the database
      // For now, we'll just log the update
      
      if (status === 'delivered') {
        log(`Order ${orderId} has been delivered!`, 'ShipDay');
      } else if (status === 'out_for_delivery') {
        log(`Order ${orderId} is out for delivery`, 'ShipDay');
      } else if (status === 'picked_up') {
        log(`Order ${orderId} has been picked up by driver`, 'ShipDay');
      }
      
    } catch (error: any) {
      log(`Error handling ShipDay webhook: ${error.message}`, 'ShipDay');
    }
  }

  // Validate if ShipDay is properly configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Get delivery estimate based on address
  async getDeliveryEstimate(address: ShipDayAddress): Promise<{
    estimatedTime: string;
    estimatedCost: number;
  } | null> {
    try {
      // This would typically call ShipDay's delivery estimate API
      // For now, we'll return a basic estimate
      return {
        estimatedTime: '30-45 minutes',
        estimatedCost: 3.99
      };
    } catch (error) {
      log(`Failed to get delivery estimate: ${error}`, 'ShipDay');
      return null;
    }
  }
}

export const shipdayService = new ShipDayService();
export type { ShipDayAddress, ShipDayOrderData, ShipDayResponse, ShipDayOrderStatus };
