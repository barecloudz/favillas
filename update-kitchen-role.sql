-- Update kitchen account role from kitchen_admin to kitchen
UPDATE users 
SET role = 'kitchen'
WHERE role = 'kitchen_admin';

-- Show the updated user
SELECT id, email, first_name, last_name, role, is_admin 
FROM users 
WHERE role = 'kitchen';
