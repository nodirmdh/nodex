from nodex.pricing import (
    CartItem,
    GeoPoint,
    OrderType,
    Promotion,
    PromotionType,
    QuoteRequest,
    VendorCategory,
    VendorInfo,
    calculate_quote,
)


def test_delivery_fee_minimum_for_delivery() -> None:
    request = QuoteRequest(
        order_type=OrderType.DELIVERY,
        vendor=VendorInfo(
            category=VendorCategory.RESTAURANTS,
            supports_pickup=True,
            geo=GeoPoint(lat=0.0, lng=0.0),
        ),
        items=[CartItem(item_id="item-1", unit_price=10000, quantity=1)],
        delivery_geo=GeoPoint(lat=0.0, lng=0.0),
        delivery_comment="Leave at the door",
        promotions=[],
    )

    quote = calculate_quote(request)

    assert quote.delivery_fee == 3000
    assert quote.service_fee == 3000


def test_pickup_fee_is_zero() -> None:
    request = QuoteRequest(
        order_type=OrderType.PICKUP,
        vendor=VendorInfo(
            category=VendorCategory.RESTAURANTS,
            supports_pickup=True,
            geo=GeoPoint(lat=51.5, lng=-0.1),
        ),
        items=[CartItem(item_id="item-1", unit_price=8000, quantity=1)],
        promotions=[],
    )

    quote = calculate_quote(request)

    assert quote.delivery_fee == 0
    assert quote.service_fee == 3000


def test_fixed_price_and_percent_promotions_do_not_stack() -> None:
    request = QuoteRequest(
        order_type=OrderType.DELIVERY,
        vendor=VendorInfo(
            category=VendorCategory.RESTAURANTS,
            supports_pickup=True,
            geo=GeoPoint(lat=0.0, lng=0.0),
        ),
        items=[CartItem(item_id="item-1", unit_price=10000, quantity=2)],
        delivery_geo=GeoPoint(lat=0.0, lng=0.0),
        delivery_comment="Call on arrival",
        promotions=[
            Promotion(
                promo_type=PromotionType.FIXED_PRICE,
                item_ids=["item-1"],
                fixed_price_amount=7000,
            ),
            Promotion(
                promo_type=PromotionType.PERCENT,
                item_ids=["item-1"],
                percent_off=50,
            ),
        ],
    )

    quote = calculate_quote(request)

    assert quote.discount_total == 10000
    assert quote.promo_items_count == 2
