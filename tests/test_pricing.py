import pytest

from nodex.pricing import (
    FulfillmentType,
    GeoPoint,
    MenuItem,
    Promotion,
    PromotionType,
    QuoteContext,
    QuoteValidationError,
    VendorCategory,
    VendorInfo,
)
from nodex.quote import quote_cart


def _context() -> QuoteContext:
    vendor = VendorInfo(
        vendor_id="vendor-1",
        category=VendorCategory.RESTAURANTS,
        supports_pickup=True,
        geo=GeoPoint(lat=0.0, lng=0.0),
    )
    menu_items = {
        "item-1": MenuItem(item_id="item-1", vendor_id="vendor-1", price=10000, is_available=True),
        "item-2": MenuItem(item_id="item-2", vendor_id="vendor-1", price=8000, is_available=True),
    }
    promotions = [
        Promotion(
            promotion_id="promo-1",
            promo_type=PromotionType.PERCENT,
            item_ids=["item-1"],
            value_numeric=10,
        ),
        Promotion(
            promotion_id="promo-2",
            promo_type=PromotionType.FIXED_PRICE,
            item_ids=["item-2"],
            value_numeric=5000,
        ),
    ]
    return QuoteContext(vendors={vendor.vendor_id: vendor}, menu_items=menu_items, promotions=promotions)


def _delivery_payload(lat_delta: float) -> dict:
    return {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.DELIVERY.value,
        "delivery_location": {"lat": lat_delta, "lng": 0.0},
        "delivery_comment": "Leave at the door",
        "items": [{"menu_item_id": "item-1", "quantity": 1}],
    }


def _lat_delta_for_km(distance_km: float) -> float:
    return distance_km / 111.195


def test_delivery_fee_minimum_for_delivery() -> None:
    context = _context()
    payload = _delivery_payload(lat_delta=0.0)

    result = quote_cart(payload, context)

    assert result["delivery_fee"] == 3000
    assert result["service_fee"] == 3000


def test_delivery_fee_rounds_up_from_point_one_km() -> None:
    context = _context()
    payload = _delivery_payload(lat_delta=_lat_delta_for_km(0.1))

    result = quote_cart(payload, context)

    assert result["delivery_fee"] == 4000


def test_delivery_fee_rounds_up_from_two_km() -> None:
    context = _context()
    payload = _delivery_payload(lat_delta=_lat_delta_for_km(2.01))

    result = quote_cart(payload, context)

    assert result["delivery_fee"] == 6000


def test_pickup_fee_is_zero() -> None:
    context = _context()
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.PICKUP.value,
        "items": [{"menu_item_id": "item-1", "quantity": 1}],
    }

    result = quote_cart(payload, context)

    assert result["delivery_fee"] == 0
    assert result["service_fee"] == 3000


def test_delivery_requires_comment() -> None:
    context = _context()
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.DELIVERY.value,
        "delivery_location": {"lat": 0.0, "lng": 0.0},
        "items": [{"menu_item_id": "item-1", "quantity": 1}],
    }

    with pytest.raises(QuoteValidationError):
        quote_cart(payload, context)


def test_pickup_not_allowed_for_non_restaurant() -> None:
    vendor = VendorInfo(
        vendor_id="vendor-1",
        category=VendorCategory.PRODUCTS,
        supports_pickup=True,
        geo=GeoPoint(lat=0.0, lng=0.0),
    )
    context = QuoteContext(
        vendors={vendor.vendor_id: vendor},
        menu_items={
            "item-1": MenuItem(item_id="item-1", vendor_id="vendor-1", price=10000, is_available=True),
        },
        promotions=[],
    )
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.PICKUP.value,
        "items": [{"menu_item_id": "item-1", "quantity": 1}],
    }

    with pytest.raises(QuoteValidationError):
        quote_cart(payload, context)


def test_pickup_not_allowed_when_supports_pickup_false() -> None:
    vendor = VendorInfo(
        vendor_id="vendor-1",
        category=VendorCategory.RESTAURANTS,
        supports_pickup=False,
        geo=GeoPoint(lat=0.0, lng=0.0),
    )
    context = QuoteContext(
        vendors={vendor.vendor_id: vendor},
        menu_items={
            "item-1": MenuItem(item_id="item-1", vendor_id="vendor-1", price=10000, is_available=True),
        },
        promotions=[],
    )
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.PICKUP.value,
        "items": [{"menu_item_id": "item-1", "quantity": 1}],
    }

    with pytest.raises(QuoteValidationError):
        quote_cart(payload, context)


def test_percent_promotion_applies_correctly() -> None:
    context = _context()
    payload = _delivery_payload(lat_delta=0.0)

    result = quote_cart(payload, context)

    assert result["discount_total"] == 1000
    assert result["promo_items_count"] == 1


def test_fixed_price_promotion_applies_correctly() -> None:
    context = _context()
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.DELIVERY.value,
        "delivery_location": {"lat": 0.0, "lng": 0.0},
        "delivery_comment": "Gate code 1234",
        "items": [{"menu_item_id": "item-2", "quantity": 1}],
    }

    result = quote_cart(payload, context)

    assert result["discount_total"] == 3000
    assert result["promo_items_count"] == 1


def test_best_discount_used_when_multiple_promotions_apply() -> None:
    vendor = VendorInfo(
        vendor_id="vendor-1",
        category=VendorCategory.RESTAURANTS,
        supports_pickup=True,
        geo=GeoPoint(lat=0.0, lng=0.0),
    )
    menu_items = {
        "item-1": MenuItem(item_id="item-1", vendor_id="vendor-1", price=10000, is_available=True),
    }
    promotions = [
        Promotion(
            promotion_id="promo-1",
            promo_type=PromotionType.PERCENT,
            item_ids=["item-1"],
            value_numeric=50,
        ),
        Promotion(
            promotion_id="promo-2",
            promo_type=PromotionType.FIXED_PRICE,
            item_ids=["item-1"],
            value_numeric=7000,
        ),
    ]
    context = QuoteContext(vendors={vendor.vendor_id: vendor}, menu_items=menu_items, promotions=promotions)
    payload = {
        "vendor_id": "vendor-1",
        "fulfillment_type": FulfillmentType.DELIVERY.value,
        "delivery_location": {"lat": 0.0, "lng": 0.0},
        "delivery_comment": "Call on arrival",
        "items": [{"menu_item_id": "item-1", "quantity": 2}],
    }

    result = quote_cart(payload, context)

    assert result["discount_total"] == 10000
    assert result["promo_items_count"] == 1
