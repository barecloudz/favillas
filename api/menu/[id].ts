import { Handler } from '@netlify/functions';
import { authenticateToken } from '../_shared/auth';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Extract menu item ID from URL path
  const id = event.path?.split('/').pop();

  if (!id || isNaN(parseInt(id))) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid menu item ID' })
    };
  }

  // Check authentication for non-GET requests
  if (event.httpMethod !== 'GET') {
    const authPayload = await authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Only admins can modify menu items
    if (!['admin', 'manager', 'super_admin'].includes(authPayload.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin or Manager access required' })
      };
    }
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } = await import("drizzle-orm/pg-core");
    const { eq } = await import('drizzle-orm');

    // Define menuItems table inline to avoid import issues
    const menuItems = pgTable("menu_items", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description").notNull(),
      imageUrl: text("image_url"),
      basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
      category: text("category").notNull(),
      isPopular: boolean("is_popular").default(false).notNull(),
      isNew: boolean("is_new").default(false).notNull(),
      isBestSeller: boolean("is_best_seller").default(false).notNull(),
      isAvailable: boolean("is_available").default(true).notNull(),
      options: jsonb("options"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
    });

    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
      types: {
        bigint: postgres.BigInt,
      },
    });

    const db = drizzle(sql);

    if (event.httpMethod === 'GET') {
      // Get specific menu item
      const menuItem = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, parseInt(id)))
        .limit(1);

      await sql.end();

      if (!menuItem || menuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(menuItem[0])
      };
    } else if (event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') {
      // Partial or full update of menu item
      const updateData = JSON.parse(event.body || '{}');
      console.log(`🔄 ${event.httpMethod} updating menu item ${id}:`, {
        updateData,
        fieldsToUpdate: Object.keys(updateData)
      });

      // Build update object only with provided fields (PATCH behavior)
      const updateFields: any = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.imageUrl !== undefined) updateFields.imageUrl = updateData.imageUrl;
      if (updateData.basePrice !== undefined) updateFields.basePrice = updateData.basePrice;
      if (updateData.category !== undefined) updateFields.category = updateData.category;
      if (updateData.isPopular !== undefined) updateFields.isPopular = updateData.isPopular;
      if (updateData.isNew !== undefined) updateFields.isNew = updateData.isNew;
      if (updateData.isBestSeller !== undefined) updateFields.isBestSeller = updateData.isBestSeller;
      if (updateData.isAvailable !== undefined) updateFields.isAvailable = updateData.isAvailable;
      if (updateData.options !== undefined) updateFields.options = updateData.options;

      console.log('📝 Final update fields:', updateFields);

      const updatedMenuItem = await db
        .update(menuItems)
        .set(updateFields)
        .where(eq(menuItems.id, parseInt(id)))
        .returning();

      console.log('✅ Menu item update result:', {
        updatedCount: updatedMenuItem.length,
        updatedItem: updatedMenuItem[0]
      });

      await sql.end();

      if (updatedMenuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedMenuItem[0])
      };
    } else if (event.httpMethod === 'DELETE') {
      // Check for foreign key constraints before attempting deletion
      console.log(`Checking foreign key constraints for menu item ${id}...`);

      // Define other tables for constraint checking
      const orderItems = pgTable("order_items", {
        id: serial("id").primaryKey(),
        menuItemId: integer("menu_item_id").notNull(),
      });

      const menuItemChoiceGroups = pgTable("menu_item_choice_groups", {
        id: serial("id").primaryKey(),
        menuItemId: integer("menu_item_id").notNull(),
      });

      // 1. Check if there are order items using this menu item
      console.log('Checking for order items...');
      const orderItemsCheck = await db.select()
        .from(orderItems)
        .where(eq(orderItems.menuItemId, parseInt(id)))
        .limit(1);

      console.log(`Found ${orderItemsCheck.length} order items for menu item ${id}`);
      if (orderItemsCheck.length > 0) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: "Cannot delete menu item. It is being used in existing orders. Consider marking it as unavailable instead."
          })
        };
      }

      // 2. Check if there are menu item choice groups using this menu item
      console.log('Checking for menu item choice groups...');
      const choiceGroupsCheck = await db.select()
        .from(menuItemChoiceGroups)
        .where(eq(menuItemChoiceGroups.menuItemId, parseInt(id)))
        .limit(1);

      console.log(`Found ${choiceGroupsCheck.length} choice group assignments for menu item ${id}`);
      if (choiceGroupsCheck.length > 0) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: "Cannot delete menu item. It has associated choice groups. Please remove the choice group assignments first."
          })
        };
      }

      // If all checks pass, proceed with deletion
      console.log(`All checks passed, deleting menu item ${id}`);
      const deletedMenuItem = await db
        .delete(menuItems)
        .where(eq(menuItems.id, parseInt(id)))
        .returning();

      console.log(`Successfully deleted menu item ${id}`);
      await sql.end();

      if (deletedMenuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Menu item deleted successfully' })
      };
    } else {
      await sql.end();
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Menu item API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to process menu item request',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};