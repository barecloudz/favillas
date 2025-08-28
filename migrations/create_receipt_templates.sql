-- Create receipt_templates table
CREATE TABLE IF NOT EXISTS receipt_templates (
    template_id TEXT PRIMARY KEY,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_receipt_templates_updated_at ON receipt_templates(updated_at);

-- Insert default templates
INSERT INTO receipt_templates (template_id, template_data) VALUES 
('customer', '{
    "id": "customer",
    "name": "Customer Receipt",
    "description": "Receipt given to customer with order details and pickup info",
    "template": "FAVILLA''S NY PIZZA\\n123 Main St, Asheville, NC\\n(828) 555-0123\\n======================\\n\\nOrder #: {{orderNumber}}\\nTime: {{orderTime}}\\nCustomer: {{customerName}}\\nReady: {{estimatedReadyTime}}\\nType: {{orderType}}\\n\\nITEMS:\\n----------------------\\n{{#items}}\\n{{quantity}}x {{name}}\\n{{#modifications}}\\n  + {{.}}\\n{{/modifications}}\\n    ${{itemTotal}}\\n{{/items}}\\n\\n======================\\nTOTAL: ${{total}}\\nPayment: {{paymentMethod}}\\n\\nThank you for your order!\\n{{#isPickup}}\\nPlease wait for pickup call\\n{{/isPickup}}\\n{{#isDelivery}}\\nYour order is being prepared\\nfor delivery\\n{{/isDelivery}}\\n\\nVisit us again soon!",
    "variables": ["orderNumber", "orderTime", "customerName", "estimatedReadyTime", "orderType", "items", "total", "paymentMethod", "isPickup", "isDelivery"]
}') ON CONFLICT (template_id) DO NOTHING;

INSERT INTO receipt_templates (template_id, template_data) VALUES 
('kitchen', '{
    "id": "kitchen",
    "name": "Kitchen Ticket",
    "description": "Ticket for kitchen staff with prep instructions (no prices)",
    "template": "*** KITCHEN COPY ***\\n===================\\n\\nORDER #{{orderNumber}}\\n{{orderTime}}\\nCustomer: {{customerName}}\\nType: {{orderType}}\\n{{#deliveryAddress}}\\nAddress: {{deliveryAddress}}\\n{{/deliveryAddress}}\\n\\nITEMS TO PREPARE:\\n-----------------\\n{{#items}}\\n[{{quantity}}] {{name}}\\n{{#modifications}}\\n  >> {{.}}\\n{{/modifications}}\\n{{#specialInstructions}}\\n  ** {{specialInstructions}}\\n{{/specialInstructions}}\\n\\n{{/items}}\\n===================\\n{{#isDelivery}}\\n   DELIVERY ORDER   \\n{{/isDelivery}}\\n{{#isPickup}}\\n   PICKUP ORDER     \\n{{/isPickup}}\\n{{#estimatedReadyTime}}\\nReady by: {{estimatedReadyTime}}\\n{{/estimatedReadyTime}}",
    "variables": ["orderNumber", "orderTime", "customerName", "orderType", "deliveryAddress", "items", "estimatedReadyTime", "isPickup", "isDelivery"]
}') ON CONFLICT (template_id) DO NOTHING;

INSERT INTO receipt_templates (template_id, template_data) VALUES 
('records', '{
    "id": "records",
    "name": "Records Copy",
    "description": "Complete transaction record for business accounting",
    "template": "*** RECORDS COPY ***\\nFAVILLA''S NY PIZZA\\n===================\\n\\nOrder #: {{orderNumber}}\\nDate/Time: {{orderTime}}\\nOrder Type: {{orderType}}\\nStaff: {{staffMember}}\\n\\nCUSTOMER INFO:\\n--------------\\nName: {{customerName}}\\nPhone: {{customerPhone}}\\nEmail: {{customerEmail}}\\n{{#deliveryAddress}}\\nAddress: {{deliveryAddress}}\\n{{/deliveryAddress}}\\n\\nORDER DETAILS:\\n--------------\\n{{#items}}\\n{{quantity}}x {{name}} @ ${{price}}\\n{{#modifications}}\\n  + {{.}}\\n{{/modifications}}\\n{{#specialInstructions}}\\n  Note: {{specialInstructions}}\\n{{/specialInstructions}}\\n  Subtotal: ${{itemTotal}}\\n\\n{{/items}}\\n===================\\nTOTAL: ${{total}}\\nPayment: {{paymentMethod}}\\n\\nRecord kept for business\\naccounting purposes",
    "variables": ["orderNumber", "orderTime", "orderType", "staffMember", "customerName", "customerPhone", "customerEmail", "deliveryAddress", "items", "total", "paymentMethod"]
}') ON CONFLICT (template_id) DO NOTHING;