-- Phase 1 base schema for vendors, menu items, and promotions.

CREATE TABLE vendors (
    id UUID PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    address_text TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    supports_pickup BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE promotions (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    value_numeric INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE promotion_items (
    promotion_id UUID NOT NULL REFERENCES promotions(id),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    PRIMARY KEY (promotion_id, menu_item_id)
);
