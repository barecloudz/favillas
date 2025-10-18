import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, RotateCcw, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReceiptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

const defaultTemplates: ReceiptTemplate[] = [
  {
    id: 'customer',
    name: 'Customer Receipt',
    description: 'Receipt given to customer with order details and pickup info',
    template: `FAVILLA'S NY PIZZA
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
    \${{itemTotal}}
{{/items}}

======================
TOTAL: \${{total}}
Payment: {{paymentMethod}}

Thank you for your order!
{{#isPickup}}
Please wait for pickup call
{{/isPickup}}
{{#isDelivery}}
Your order is being prepared
for delivery
{{/isDelivery}}

Visit us again soon!`,
    variables: ['orderNumber', 'orderTime', 'customerName', 'estimatedReadyTime', 'orderType', 'items', 'itemTotal', 'total', 'paymentMethod', 'isPickup', 'isDelivery']
  },
  {
    id: 'kitchen',
    name: 'Kitchen Ticket',
    description: 'Ticket for kitchen staff with prep instructions (no prices)',
    template: `╔═══════════════════╗
║  KITCHEN TICKET   ║
╚═══════════════════╝

ORDER #{{orderNumber}}
Name: {{customerName}}
Time: {{orderTime}}

{{#isDelivery}}
*** DELIVERY ***
{{/isDelivery}}
{{#isPickup}}
*** PICKUP ***
{{/isPickup}}

WHAT YOU NEED TO MAKE:
═════════════════════

{{#items}}
┌─────────────────────
│ {{quantity}}x {{name}}
{{#modifications}}
│   ✓ {{.}}
{{/modifications}}
{{#specialInstructions}}
│   ⚠️  NOTE: {{specialInstructions}}
{{/specialInstructions}}
└─────────────────────

{{/items}}

═════════════════════
{{#estimatedReadyTime}}
⏰ Ready by: {{estimatedReadyTime}}
{{/estimatedReadyTime}}
{{#deliveryAddress}}
📍 {{deliveryAddress}}
{{/deliveryAddress}}`,
    variables: ['orderNumber', 'orderTime', 'customerName', 'orderType', 'deliveryAddress', 'items', 'modifications', 'specialInstructions', 'estimatedReadyTime', 'isPickup', 'isDelivery']
  },
  {
    id: 'records',
    name: 'Records Copy',
    description: 'Complete transaction record for business accounting',
    template: `*** RECORDS COPY ***
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
{{quantity}}x {{name}} @ \${{price}}
{{#modifications}}
  + {{.}}
{{/modifications}}
{{#specialInstructions}}
  Note: {{specialInstructions}}
{{/specialInstructions}}
  Subtotal: \${{itemTotal}}

{{/items}}
===================
TOTAL: \${{total}}
Payment: {{paymentMethod}}

Record kept for business
accounting purposes`,
    variables: ['orderNumber', 'orderTime', 'orderType', 'staffMember', 'customerName', 'customerPhone', 'customerEmail', 'deliveryAddress', 'items', 'price', 'itemTotal', 'total', 'paymentMethod']
  }
];

export function TemplateEditor() {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>(defaultTemplates);
  const [activeTemplate, setActiveTemplate] = useState('customer');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const currentTemplate = templates.find(t => t.id === activeTemplate)!;

  const handleTemplateChange = (newTemplate: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === activeTemplate 
        ? { ...t, template: newTemplate }
        : t
    ));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/receipt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });

      if (response.ok) {
        setIsEditing(false);
        toast({
          title: "Templates Saved",
          description: "Receipt templates have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save templates');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/admin/test-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId: activeTemplate,
          template: currentTemplate.template
        })
      });

      if (response.ok) {
        toast({
          title: "Test Print Sent",
          description: `Test ${currentTemplate.name.toLowerCase()} sent to printer.`,
        });
      } else {
        throw new Error('Failed to test print');
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to send test print. Check printer connection.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    const originalTemplate = defaultTemplates.find(t => t.id === activeTemplate);
    if (originalTemplate) {
      setTemplates(prev => prev.map(t => 
        t.id === activeTemplate 
          ? { ...t, template: originalTemplate.template }
          : t
      ));
      setIsEditing(false);
    }
  };

  const renderPreview = () => {
    // Simple preview with sample data
    let preview = currentTemplate.template;
    
    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      orderNumber: 'DEMO-123',
      orderTime: new Date().toLocaleString(),
      customerName: 'John Doe',
      customerPhone: '(828) 555-1234',
      customerEmail: 'john@example.com',
      estimatedReadyTime: '12:30 PM',
      orderType: 'PICKUP',
      total: '24.99',
      paymentMethod: 'CARD',
      staffMember: 'Admin',
      deliveryAddress: '123 Main St, Asheville, NC',
      price: '14.99',
      itemTotal: '14.99'
    };

    // Simple variable replacement (basic implementation)
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Handle items section (simplified)
    preview = preview.replace(
      /{{#items}}[\s\S]*?{{\/items}}/g,
      `1x Margherita Pizza 12"
  + Extra cheese
    $14.99
2x Garlic Bread
    $5.00
1x Soda
  + Coke
    $2.50`
    );

    // Handle conditional sections
    preview = preview.replace(/{{#isPickup}}[\s\S]*?{{\/isPickup}}/g, 'Please wait for pickup call');
    preview = preview.replace(/{{#isDelivery}}[\s\S]*?{{\/isDelivery}}/g, '');
    preview = preview.replace(/{{#deliveryAddress}}[\s\S]*?{{\/deliveryAddress}}/g, '');

    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receipt Template Editor</h2>
          <p className="text-gray-600">Customize your receipt templates with a visual editor</p>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Testing...' : 'Test Print'}
          </Button>
          <Button onClick={handleSave} disabled={!isEditing || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Templates'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTemplate} onValueChange={setActiveTemplate}>
        <TabsList className="grid w-full grid-cols-3">
          {templates.map(template => (
            <TabsTrigger key={template.id} value={template.id}>
              {template.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {templates.map(template => (
          <TabsContent key={template.id} value={template.id}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {isEditing && <Badge variant="secondary">Modified</Badge>}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template">Template Content</Label>
                      <Textarea
                        id="template"
                        value={template.template}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Enter your template content..."
                      />
                    </div>
                    
                    <div>
                      <Label>Available Variables</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.variables.map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Use these variables in your template. Items use {`{{#items}}...{{/items}}`} loops.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    Preview how your receipt will look with sample data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {renderPreview()}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Template Syntax Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Basic Variables</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{"{{orderNumber}}"}</code> - Order number</li>
                <li><code>{"{{customerName}}"}</code> - Customer name</li>
                <li><code>{"{{total}}"}</code> - Order total</li>
                <li><code>{"{{orderTime}}"}</code> - Order timestamp</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Conditional Sections</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{"{{#isPickup}}...{{/isPickup}}"}</code> - Pickup only</li>
                <li><code>{"{{#isDelivery}}...{{/isDelivery}}"}</code> - Delivery only</li>
                <li><code>{"{{#deliveryAddress}}...{{/deliveryAddress}}"}</code> - If has address</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Item Loops</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code>{"{{#items}}...{{/items}}"}</code> - Loop through items</li>
                <li><code>{"{{quantity}}"}</code> - Item quantity</li>
                <li><code>{"{{name}}"}</code> - Item name</li>
                <li><code>{"{{price}}"}</code> - Item price</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Formatting</h4>
              <ul className="space-y-1 text-gray-600">
                <li>Use <code>\n</code> for line breaks</li>
                <li>Use <code>=</code> or <code>-</code> for separators</li>
                <li>Spaces and indentation are preserved</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}