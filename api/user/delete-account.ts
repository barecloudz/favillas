import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const handler: Handler = async (event, context) => {
  // Only allow DELETE method
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get user from authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No authorization header' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const userId = user.id;

    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // Step 1: Delete user rewards/points data
    const { error: rewardsError } = await supabase
      .from('user_rewards')
      .delete()
      .eq('user_id', userId);

    if (rewardsError) {
      console.error('Error deleting rewards:', rewardsError);
    }

    // Step 2: Delete vouchers/redemptions
    const { error: vouchersError } = await supabase
      .from('vouchers')
      .delete()
      .eq('user_id', userId);

    if (vouchersError) {
      console.error('Error deleting vouchers:', vouchersError);
    }

    // Step 3: Anonymize orders (keep for business records, but remove personal data)
    const { error: ordersError } = await supabase
      .from('orders')
      .update({
        customer_name: 'Deleted User',
        customer_email: null,
        customer_phone: null,
        delivery_address: null,
        user_id: null,
        supabase_user_id: null
      })
      .eq('supabase_user_id', userId);

    if (ordersError) {
      console.error('Error anonymizing orders:', ordersError);
    }

    // Step 4: Delete user profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // Step 5: Delete the user from Supabase Auth (this is the final step)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to delete user account',
          details: deleteError.message
        }),
      };
    }

    console.log(`✅ Successfully deleted account for user: ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Account deleted successfully'
      }),
    };

  } catch (error: any) {
    console.error('❌ Error in delete-account:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
    };
  }
};
