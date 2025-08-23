-- Create riders table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  hub TEXT NOT NULL,
  status TEXT NOT NULL,
  location JSONB,
  last_seen TIMESTAMP WITH TIME ZONE,
  vehicle TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  awb TEXT NOT NULL UNIQUE,
  customer TEXT NOT NULL,
  pickup_hub TEXT NOT NULL,
  destination_hub TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_rider_id TEXT REFERENCES public.riders(rider_id),
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a logistics system)
CREATE POLICY "Anyone can view riders" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);

-- Insert sample riders data
INSERT INTO public.riders (rider_id, name, phone, hub, status, location, last_seen, vehicle) VALUES
('R123', 'Ramesh Kumar', '+919812345678', 'Bengaluru-HUB-1', 'active', '{"type":"Point","coordinates":[77.5970,12.9716]}', '2025-08-22T11:40:00Z', 'bike'),
('R124', 'Suresh Reddy', '+919876543210', 'Hyderabad-HUB-2', 'active', '{"type":"Point","coordinates":[78.4867,17.3850]}', '2025-08-22T10:30:00Z', 'bike'),
('R125', 'Mahesh Singh', '+919988776655', 'Chennai-HUB-3', 'inactive', '{"type":"Point","coordinates":[80.2707,13.0827]}', '2025-08-22T09:15:00Z', 'van');

-- Insert sample orders data
INSERT INTO public.orders (order_id, awb, customer, pickup_hub, destination_hub, status, assigned_rider_id, phone) VALUES
('LS001234', 'AWB789456', 'John Doe', 'Mumbai Central', 'Delhi North', 'In Transit', 'R123', '+91-9876541234'),
('LS005678', 'AWB123789', 'Priya Sharma', 'Bangalore Tech Park', 'Chennai Express', 'Delivered', 'R124', '+91-8765432109'),
('LS009876', 'AWB456123', 'Arjun Patel', 'Pune West', 'Bengaluru-HUB-1', 'Pickup Scheduled', 'R125', '+91-9123456789');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_riders_updated_at
BEFORE UPDATE ON public.riders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();