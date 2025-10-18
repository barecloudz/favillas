import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createKitchenAdmin() {
  try {
    console.log('🔧 Creating kitchen admin user...');

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'kitchen@favillaspizzeria.com',
      password: 'Favillas69',
      email_confirm: true,
      user_metadata: {
        firstName: 'Kitchen',
        lastName: 'Admin',
        role: 'kitchen_admin'
      }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      return;
    }

    console.log('✅ Created auth user:', authData.user.id);

    // Check if user record exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_user_id', authData.user.id)
      .single();

    if (!existingUser) {
      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          supabase_user_id: authData.user.id,
          email: 'kitchen@favillaspizzeria.com',
          first_name: 'Kitchen',
          last_name: 'Admin',
          role: 'kitchen_admin',
          is_admin: true,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Failed to create user record:', userError);
        return;
      }

      console.log('✅ Created user record:', userData.id);
    } else {
      // Update existing user to kitchen_admin role
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'kitchen_admin',
          is_admin: true,
          first_name: 'Kitchen',
          last_name: 'Admin'
        })
        .eq('supabase_user_id', authData.user.id);

      if (updateError) {
        console.error('❌ Failed to update user record:', updateError);
        return;
      }

      console.log('✅ Updated existing user to kitchen_admin role');
    }

    console.log('');
    console.log('🎉 Kitchen admin user created successfully!');
    console.log('');
    console.log('📧 Email: kitchen@favillaspizzeria.com');
    console.log('🔑 Password: Favillas69');
    console.log('👤 Role: kitchen_admin');
    console.log('');
    console.log('This user has access to:');
    console.log('  ✅ Orders & Kitchen Display');
    console.log('  ✅ Menu Management');
    console.log('  ✅ Restaurant Settings');
    console.log('  ✅ Rewards Management');
    console.log('  ✅ Marketing Tools');
    console.log('  ✅ Employee Schedules');
    console.log('');
    console.log('This user CANNOT access:');
    console.log('  ❌ Payroll & Hours');
    console.log('  ❌ Employee Hourly Rates');

  } catch (error) {
    console.error('❌ Error creating kitchen admin:', error);
  }
}

createKitchenAdmin();
