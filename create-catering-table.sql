-- Create catering_inquiries table
CREATE TABLE IF NOT EXISTS catering_inquiries (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    custom_event_type VARCHAR(255),
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('pickup', 'delivery')),
    event_address TEXT,
    event_date DATE,
    event_time TIME,
    special_delivery_instructions TEXT,
    guest_count VARCHAR(20) NOT NULL,
    custom_guest_count INTEGER,
    menu_style VARCHAR(50) NOT NULL,
    dietary_restrictions JSONB DEFAULT '[]',
    budget_range VARCHAR(50),
    additional_services JSONB DEFAULT '[]',
    special_requests TEXT,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    preferred_contact VARCHAR(20),
    best_time_to_call VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_catering_inquiries_status ON catering_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_catering_inquiries_created_at ON catering_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_catering_inquiries_event_date ON catering_inquiries(event_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_catering_inquiries_updated_at
    BEFORE UPDATE ON catering_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();