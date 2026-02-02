-- Phase 1 base schema for vendors, menu, orders, and quotes.

CREATE TABLE vendors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    supports_pickup BOOLEAN NOT NULL DEFAULT FALSE,
    address_text TEXT NOT NULL,
    geo_lat DOUBLE PRECISION NOT NULL,
    geo_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    name TEXT NOT NULL,
    price_amount INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    client_id UUID NOT NULL,
    order_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    delivery_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price_amount INTEGER NOT NULL
);

CREATE TABLE quotes (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    items_subtotal INTEGER NOT NULL,
    discount_total INTEGER NOT NULL,
    service_fee INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    promo_items_count INTEGER NOT NULL DEFAULT 0,
    combo_count INTEGER NOT NULL DEFAULT 0,
    buyxgety_count INTEGER NOT NULL DEFAULT 0,
    gift_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
