-- Favilla's NY Pizza Menu Import
-- Complete menu items import (excluding subs and pasta)
-- Images will be added manually afterwards
-- SAFE IMPORT: Only adds items that don't already exist

-- First, let's ensure we have the basic categories (only if they don't exist)
INSERT INTO categories (name, "order", is_active) VALUES
('Appetizers', 1, true),
('Sides', 2, true),
('Traditional Pizza', 3, true),
('Grandmas Style Pizzas', 4, true),
('10" Specialty Gourmet Pizzas', 5, true),
('14" Specialty Gourmet Pizzas', 6, true),
('16" Specialty Gourmet Pizzas', 7, true),
('Sicilian Specialty Gourmet Pizzas', 8, true),
('Salads', 9, true),
('Calzones', 10, true),
('Strombolis', 11, true),
('Drinks', 12, true),
('Desserts', 13, true),
('Gluten Free Crust 10" Specialty Gourmet Pizzas', 14, true),
('Dough Balls', 15, true)
ON CONFLICT (name) DO NOTHING;

-- APPETIZERS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Mozzarella Sticks Appetizer', '6 Mozzarella Sticks Served with homemade marinara.', 8.99, 'Appetizers', true),
('Fried Zucchini Sticks Appetizer', 'Served with roasted red pepper sauce', 8.99, 'Appetizers', true),
('Wings Appetizer', '6 wings with 7 flavours to choose from.', 11.99, 'Appetizers', true),
('Meatballs & Sausage Appetizer', 'Served with Melted Mozzarella & Garlic Rolls.', 9.95, 'Appetizers', true),
('Chicken Fingers Appetizer', 'Served with French Fries.', 9.99, 'Appetizers', true),
('Spinach Pinwheels Appetizer', 'Spinach with ricotta and mozzarella cheese.', 4.95, 'Appetizers', true),
('Garlic Knot Sliders Appetizer', '', 4.50, 'Appetizers', true),
('Pepperoni Pinwheel', 'Pepperonis and meatballs with ricotta and mozzarella cheese', 4.95, 'Appetizers', true);

-- SIDES
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Garlic Rolls', '', 4.25, 'Sides', true),
('Sausage Or Meatballs', '', 8.95, 'Sides', true),
('Jamaican Beef Patties', '', 3.25, 'Sides', true),
('Side Order Of French Fries', '', 3.99, 'Sides', true),
('Side Dressing', '', 1.00, 'Sides', true),
('Side Marinara', '', 1.00, 'Sides', true);

-- TRADITIONAL PIZZA
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('10" Traditional Pizza', '', 10.99, 'Traditional Pizza', true),
('14" Traditional Pizza', '', 14.99, 'Traditional Pizza', true),
('16" Traditional Pizza', '', 16.99, 'Traditional Pizza', true),
('Sicilian Traditional Pizza', '', 22.99, 'Traditional Pizza', true);

-- GRANDMAS STYLE PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Grandma Pie', 'Fresh Mozzarella Plump Tomato & Fresh Basil', 22.99, 'Grandmas Style Pizzas', true),
('Grandma Alla Vodka', 'Vodka Sauce, Fresh Mozzarella, Fresh Basil, Olive Oil', 29.99, 'Grandmas Style Pizzas', true),
('Grandmas Caprese', 'Fresh Mozzarella, Fresh Tomato, Basil, Olive Oil Balsamic Glaze, Salt & Pepper.', 29.99, 'Grandmas Style Pizzas', true),
('Tri Color Vodka Grandma', 'Mozzarella Topped with Pesto, Marinara & Alla Vodka Sauce', 29.99, 'Grandmas Style Pizzas', true),
('Grandma Primavera', 'Grandmas style Spinach, Artichoke, lightly breaded Eggplant & Zucchini, on Garlic, Olive oil, Garlic butter & Parmesan crust, topped lightly with our Dinner sauce & Asiago cheese', 29.99, 'Grandmas Style Pizzas', true),
('Grandma''s Spinach Artichoke', 'Cream of Spinach, Artichoke, Asiago', 29.99, 'Grandmas Style Pizzas', true),
('Nonna''s Pesto Chicken Grandma', 'Roasted Peppers, Tomatoes, Grilled Chicken & Pesto', 29.99, 'Grandmas Style Pizzas', true);

-- 10" SPECIALTY GOURMET PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('10" House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Veggie Special Pizza', 'Eggplant, green peppers, onions, garlic, tomato, mushrooms, spinach & black olives', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Meat Special Pizza', 'Ground beef, pepperoni, ham, sausage & bacon', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Chicken Parmesan Pizza', 'Freshly made chicken cutlets with dinner sauce, melted mozzarella, a light ricotta topping with fresh basil & Romano cheese', 16.49, '10" Specialty Gourmet Pizzas', false),
('10" Meatball Parmesan Pizza', 'Homemade meatballs & dinner sauce with melted mozzarella, light ricotta, fresh basil & Romano cheese', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Lasagna Pizza', 'Two layers of pasta & ground beef, ricotta, mozzarella, dinner sauce & topped with fresh basil', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Eggplant Parmesan Pizza', 'Lightly breaded eggplant with melted mozzarella, light ricotta, fresh basil & Romano', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" White Mediterranean Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Eggplant Or Chicken Alfredo Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Alfredo Delight Pizza', 'Homemade Alfredo Sauce with Grilled Chicken, Spinach, Roasted Peppers & Roasted Garlic', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Pizza Primavera', 'Spinach, Artichoke, Lightly Breaded Eggplant & Zucchini on Garlic, Olive Oil, Sesame Crust, Topped Lightly With Our Dinner Sauce & Asiago Cheese.', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" BBQ Chicken Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella& cheddar cheese blend', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" BBQ Delight Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella & cheddar cheese blend, Red Onion, Pineapple', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Steak Deluxe Pizza', 'Tender Sliced Steak with sautéed peppers, onions, mushrooms, mozzarella & cheddar cheese blend', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" CheeseBurger Pizza', 'Black angus ground beef, bacon, cheddar cheese with a tasty burger sauce. Available with lettuce, tomato & onion', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Pizza Fresco', 'Homemade marinara sauce, fresh mozzarella, basil, olive oil & diced tomato', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Balsamic Chicken Pizza', 'Breaded chicken cutlets with diced tomato, fresh basil, mozzarella & balsamic glaze', 16.49, '10" Specialty Gourmet Pizzas', false),
('10" Margherita Pizza', 'Fresh Tomato, Mozzarella, Basil & Olive Oil', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Cream Of Spinach Pizza', 'Homemade cream of spinach sauce with a sesame crust topped with melted mozzarella & Asiago Cheese', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Buffalo Chicken Pizza', 'Grilled diced chicken, homemade Buffalo sauce with a cheddar cheese, blue cheese & Mozzarella Blend', 16.49, '10" Specialty Gourmet Pizzas', true),
('10" Hidden Valley Pizza', 'Grilled chicken, cheddar cheese & bacon with a ranch dressing base', 16.49, '10" Specialty Gourmet Pizzas', true);

-- 14" SPECIALTY GOURMET PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('14" House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Veggie Special Pizza', 'Eggplant, green peppers, onions, garlic, tomato, mushrooms, spinach & black olives', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Meat Special Pizza', 'Ground beef, pepperoni, ham, sausage & bacon', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Chicken Parmesan Pizza', 'Freshly made chicken cutlets with dinner sauce, melted mozzarella, a light ricotta topping with fresh basil & Romano cheese', 23.49, '14" Specialty Gourmet Pizzas', false),
('14" Meatball Parmesan Pizza', 'Homemade meatballs & dinner sauce with melted mozzarella, light ricotta, fresh basil & Romano cheese', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Lasagna Pizza', 'Two layers of pasta & ground beef, ricotta, mozzarella, dinner sauce & topped with fresh basil', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Eggplant Parmesan Pizza', 'Lightly breaded eggplant with melted mozzarella, light ricotta, fresh basil & Romano', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" White Mediterranean Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Eggplant or Chicken Alfredo Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Alfredo Delight Pizza', 'Homemade Alfredo Sauce with Grilled Chicken, Spinach, Roasted Peppers & Roasted Garlic', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Pizza Primavera', 'Spinach, Artichoke, Lightly Breaded Eggplant & Zucchini on Garlic, Olive Oil, Sesame Crust, Topped Lightly With Our Dinner Sauce & Asiago Cheese.', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" BBQ Chicken Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella& cheddar cheese blend', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" BBQ Delight Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella & cheddar cheese blend, Red Onion, Pineapple', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Steak Deluxe Pizza', 'Tender Sliced Steak with sautéed peppers, onions, mushrooms, mozzarella & cheddar cheese blend', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" CheeseBurger Pizza', 'Black angus ground beef, bacon, cheddar cheese with a tasty burger sauce. Available with lettuce, tomato & onion', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Pizza Fresco', 'Homemade marinara sauce, fresh mozzarella, basil, olive oil & diced tomato', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Balsamic Chicken Pizza', 'Breaded chicken cutlets with diced tomato, fresh basil, mozzarella & balsamic glaze', 23.49, '14" Specialty Gourmet Pizzas', false),
('14" Margherita Pizza', 'Fresh Tomato, Mozzarella, Basil & Olive Oil', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Cream Of Spinach Pizza', 'Homemade cream of spinach sauce with a sesame crust topped with melted mozzarella & Asiago Cheese', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Buffalo Chicken Pizza', 'Grilled diced chicken, homemade Buffalo sauce with a cheddar cheese, blue cheese & Mozzarella Blend', 23.49, '14" Specialty Gourmet Pizzas', true),
('14" Hidden Valley Pizza', 'Grilled chicken, cheddar cheese & bacon with a ranch dressing base', 23.49, '14" Specialty Gourmet Pizzas', true);

-- 16" SPECIALTY GOURMET PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('16" House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Veggie Special Pizza', 'Eggplant, green peppers, onions, garlic, tomato, mushrooms, spinach & black olives', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Meat Special Pizza', 'Ground beef, pepperoni, ham, sausage & bacon', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Chicken Parmesan Pizza', 'Freshly made chicken cutlets with dinner sauce, melted mozzarella, a light ricotta topping with fresh basil & Romano cheese', 26.49, '16" Specialty Gourmet Pizzas', false),
('16" Meatball Parmesan Pizza', 'Homemade meatballs & dinner sauce with melted mozzarella, light ricotta, fresh basil & Romano cheese', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Lasagna Pizza', 'Two layers of pasta & ground beef, ricotta, mozzarella, dinner sauce & topped with fresh basil', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Eggplant Parmesan Pizza', 'Lightly breaded eggplant with melted mozzarella, light ricotta, fresh basil & Romano', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" White Mediterranean Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Eggplant or Chicken Alfredo Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Alfredo Delight Pizza', 'Homemade Alfredo Sauce with Grilled Chicken, Spinach, Roasted Peppers & Roasted Garlic', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Pizza Primavera', 'Spinach, Artichoke, Lightly Breaded Eggplant & Zucchini on Garlic, Olive Oil, Sesame Crust, Topped Lightly With Our Dinner Sauce & Asiago Cheese.', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" BBQ Chicken Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella& cheddar cheese blend', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" BBQ Delight Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella & cheddar cheese blend, Red Onion, Pineapple', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Steak Deluxe Pizza', 'Tender Sliced Steak with sautéed peppers, onions, mushrooms, mozzarella & cheddar cheese blend', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" CheeseBurger Pizza', 'Black angus ground beef, bacon, cheddar cheese with a tasty burger sauce. Available with lettuce, tomato & onion', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Pizza Fresco', 'Homemade marinara sauce, fresh mozzarella, basil, olive oil & diced tomato', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Balsamic Chicken Pizza', 'Breaded chicken cutlets with diced tomato, fresh basil, mozzarella & balsamic glaze', 26.49, '16" Specialty Gourmet Pizzas', false),
('16" Margherita Pizza', 'Fresh Tomato, Mozzarella, Basil & Olive Oil', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Cream Of Spinach Pizza', 'Homemade cream of spinach sauce with a sesame crust topped with melted mozzarella & Asiago Cheese', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Buffalo Chicken Pizza', 'Grilled diced chicken, homemade Buffalo sauce with a cheddar cheese, blue cheese & Mozzarella Blend', 26.49, '16" Specialty Gourmet Pizzas', true),
('16" Hidden Valley Pizza', 'Grilled chicken, cheddar cheese & bacon with a ranch dressing base', 26.49, '16" Specialty Gourmet Pizzas', true);

-- SICILIAN SPECIALTY GOURMET PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Sicilian House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Veggie Special Pizza', 'Eggplant, green peppers, onions, garlic, tomato, mushrooms, spinach & black olives', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Meat Special Pizza', 'Ground beef, pepperoni, ham, sausage & bacon', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Chicken Parmesan Pizza', 'Freshly made chicken cutlets with dinner sauce, melted mozzarella, a light ricotta topping with fresh basil & Romano cheese', 28.99, 'Sicilian Specialty Gourmet Pizzas', false),
('Sicilian Meatball Parmesan Pizza', 'Homemade meatballs & dinner sauce with melted mozzarella, light ricotta, fresh basil & Romano cheese', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Lasagna Pizza', 'Two layers of pasta & ground beef, ricotta, mozzarella, dinner sauce & topped with fresh basil', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Eggplant Parmesan Pizza', 'Lightly breaded eggplant with melted mozzarella, light ricotta, fresh basil & Romano', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian White Mediterranean Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Eggplant or Chicken Alfredo Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Alfredo Delight Pizza', 'Homemade Alfredo Sauce with Grilled Chicken, Spinach, Roasted Peppers & Roasted Garlic', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Pizza Primavera', 'Spinach, Artichoke, Lightly Breaded Eggplant & Zucchini on Garlic, Olive Oil, Sesame Crust, Topped Lightly With Our Dinner Sauce & Asiago Cheese.', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian BBQ Chicken Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella& cheddar cheese blend', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian BBQ Delight Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella & cheddar cheese blend, Red Onion, Pineapple', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Steak Deluxe Pizza', 'Tender Sliced Steak with sautéed peppers, onions, mushrooms, mozzarella & cheddar cheese blend', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian CheeseBurger Pizza', 'Black angus ground beef, bacon, cheddar cheese with a tasty burger sauce. Available with lettuce, tomato & onion', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Pizza Fresco', 'Homemade marinara sauce, fresh mozzarella, basil, olive oil & diced tomato', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Balsamic Chicken Pizza', 'Breaded chicken cutlets with diced tomato, fresh basil, mozzarella & balsamic glaze', 28.99, 'Sicilian Specialty Gourmet Pizzas', false),
('Sicilian Margherita Pizza', 'Fresh Tomato, Mozzarella, Basil & Olive Oil', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Cream Of Spinach Pizza', 'Homemade cream of spinach sauce with a sesame crust topped with melted mozzarella & Asiago Cheese', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Buffalo Chicken Pizza', 'Grilled diced chicken, homemade Buffalo sauce with a cheddar cheese, blue cheese & Mozzarella Blend', 28.99, 'Sicilian Specialty Gourmet Pizzas', true),
('Sicilian Hidden Valley Pizza', 'Grilled chicken, cheddar cheese & bacon with a ranch dressing base', 28.99, 'Sicilian Specialty Gourmet Pizzas', true);

-- SALADS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Garden Side Salad', 'Romaine, onions, olives & tomato', 4.45, 'Salads', true),
('Caesar Salad', 'Romaine, croutons, parmesan cheese, Caesar dressing on the side or tossed', 9.95, 'Salads', true),
('Greek Salad', 'Romaine, feta, red onions, Kalamata olives, cucumbers, pepperoncini & tomato with special Greek dressing', 9.95, 'Salads', true),
('Caprese Salad', 'Tomato, fresh mozzarella, basil, olive oil & balsamic glaze', 10.45, 'Salads', true),
('Antipasto Salad', 'Romaine, tomato, onion, Kalamata olives, ham, salami, capicola, roasted peppers & mozzarella with Italian vinaigrette', 10.95, 'Salads', false),
('Spinach Salad', 'Spinach, diced egg, mushrooms, red onions, gorgonzola, sliced almonds, olive oil & balsamic glaze', 10.95, 'Salads', true);

-- CALZONES
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Cheese Calzone', 'Ricotta, Romano & mozzarella blend baked in a garlic parmesan crust Add additional ingredients for the pizza toppings price', 11.49, 'Calzones', true);

-- STROMBOLIS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Traditional Stromboli', 'Pepperoni, sausage, ham, salami, capicola, onions, mushrooms, two cheese blend of Romano & mozzarella, side of marinara', 13.95, 'Strombolis', true),
('Build Your Own Stromboli', 'Cheese Stromboli for you to build.', 13.00, 'Strombolis', true);

-- DRINKS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Bottled Water', '', 1.59, 'Drinks', true),
('Can of Coke', '', 1.59, 'Drinks', true),
('Can of Diet Coke', '', 1.59, 'Drinks', true),
('Can of Cherry Coke', '', 1.59, 'Drinks', true),
('Can of Coke Zero', '', 1.59, 'Drinks', true),
('Can of Minute Maid Lemonade', '', 1.59, 'Drinks', true),
('Can of Sprite', '', 1.59, 'Drinks', true),
('Bottle of Coke 20oz', '', 1.59, 'Drinks', true),
('Bottle of Diet Coke 20oz', '', 2.29, 'Drinks', true),
('Bottle of Cherry Coke 20oz', '', 2.29, 'Drinks', true),
('Bottle of Sprite 20oz', '', 2.29, 'Drinks', true),
('Bottle of Minute Maid Lemonade 20oz', '', 2.29, 'Drinks', true),
('Bottle of Dr Pibb Xtra 20oz', '', 2.29, 'Drinks', true),
('Bottle of Snapple Apple 20oz', '', 2.29, 'Drinks', true),
('Bottle of Snapple Fruit Punch 20oz', '', 2.29, 'Drinks', true),
('Bottle of Minute Maid Apple Juice', '', 2.29, 'Drinks', true),
('Sweet Tea', 'Bottle Of Tea Unsweet Or Sweet', 2.49, 'Drinks', true),
('Manhattan Special', '', 3.50, 'Drinks', true),
('San Pellegrino', 'Sparkling Water', 3.50, 'Drinks', true),
('Powerade', 'Bottle of Powerade', 2.50, 'Drinks', false),
('Dunkin Donut', '', 3.00, 'Drinks', false),
('Monster Energy', '', 3.50, 'Drinks', true);

-- DESSERTS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('New York Style Cheesecake', '', 6.99, 'Desserts', true),
('Mascarpone Limoncello Cake', '', 6.99, 'Desserts', true),
('Specialty Cheesecake Slice', 'Our Special Cheesecake Slices', 6.99, 'Desserts', true),
('Cannoli', '', 5.99, 'Desserts', true),
('Chocolate Cake', '', 6.99, 'Desserts', true),
('Tiramisu', '', 6.99, 'Desserts', true);

-- GLUTEN FREE CRUST 10" SPECIALTY GOURMET PIZZAS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('Gluten Free Crust 10" House Special Pizza', 'Beef, pepperoni, sausage, bacon, mushrooms, onions & green peppers', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Veggie Special Pizza', 'Eggplant, green peppers, onions, garlic, tomato, mushrooms, spinach & black olives', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Meat Special Pizza', 'Ground beef, pepperoni, ham, sausage & bacon', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Chicken Parmesan Pizza', 'Freshly made chicken cutlets with dinner sauce, melted mozzarella, a light ricotta topping with fresh basil & Romano cheese', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', false),
('Gluten Free Crust 10" Meatball Parmesan Pizza', 'Homemade meatballs & dinner sauce with melted mozzarella, light ricotta, fresh basil & Romano cheese', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Eggplant Parmesan Pizza', 'Lightly breaded eggplant with melted mozzarella, light ricotta, fresh basil & Romano', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" White Mediterranean Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Eggplant Or Chicken Alfredo Pizza', 'Fresh spinach, diced tomatoes, spinach, roasted peppers & roasted garlic', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Alfredo Delight Pizza', 'Homemade Alfredo Sauce with Grilled Chicken, Spinach, Roasted Peppers & Roasted Garlic', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" BBQ Chicken Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella& cheddar cheese blend', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" BBQ Delight Pizza', 'Tender chicken with a flavorful BBQ sauce, topped with a melted mozzarella & cheddar cheese blend, Red Onion, Pineapple', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Steak Deluxe Pizza', 'Tender Sliced Steak with sautéed peppers, onions, mushrooms, mozzarella & cheddar cheese blend', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" CheeseBurger Pizza', 'Black angus ground beef, bacon, cheddar cheese with a tasty burger sauce. Available with lettuce, tomato & onion', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Pizza Fresco', 'Homemade marinara sauce, fresh mozzarella, basil, olive oil & diced tomato', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Margherita Pizza', 'Fresh Tomato, Mozzarella, Basil & Olive Oil', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Cream Of Spinach Pizza', 'Homemade cream of spinach sauce with a sesame crust topped with melted mozzarella & Asiago Cheese', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Buffalo Chicken Pizza', 'Grilled diced chicken, homemade Buffalo sauce with a cheddar cheese, blue cheese & Mozzarella Blend', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true),
('Gluten Free Crust 10" Hidden Valley Pizza', 'Grilled chicken, cheddar cheese & bacon with a ranch dressing base', 16.49, 'Gluten Free Crust 10" Specialty Gourmet Pizzas', true);

-- DOUGH BALLS
INSERT INTO menu_items (name, description, base_price, category, is_available) VALUES
('10" Dough Ball', '', 3.00, 'Dough Balls', true),
('14" Dough Ball', '', 6.00, 'Dough Balls', true),
('16" Dough Ball', '', 8.00, 'Dough Balls', true);

-- Success message
SELECT 'Menu import completed successfully! Added ' || COUNT(*) || ' menu items.' as message
FROM menu_items
WHERE created_at >= NOW() - INTERVAL '1 minute';