const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMenuImagesBucket() {
  try {
    console.log('Checking existing buckets...');

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    console.log('Existing buckets:', buckets.map(b => b.name));

    const existingBucket = buckets.find(bucket => bucket.name === 'menu-images');

    if (existingBucket) {
      console.log('✅ Bucket "menu-images" already exists');
      return;
    }

    console.log('Creating bucket "menu-images"...');

    // Create the menu-images bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('menu-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }

    console.log('✅ Storage bucket created successfully:', bucket);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createMenuImagesBucket();