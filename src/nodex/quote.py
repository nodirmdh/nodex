from __future__ import annotations

from typing import Any, Dict

from .pricing import (
    CartLine,
    FulfillmentType,
    GeoPoint,
    PromotionType,
    QuoteContext,
    QuoteRequest,
    QuoteValidationError,
    calculate_quote,
)


class QuoteNotFoundError(QuoteValidationError):
    pass


def quote_cart(payload: Dict[str, Any], context: QuoteContext) -> Dict[str, Any]:
    vendor_id = payload.get("vendor_id")
    if not vendor_id:
        raise QuoteValidationError("vendor_id is required")

    vendor = context.vendors.get(vendor_id)
    if vendor is None:
        raise QuoteNotFoundError("vendor not found")

    try:
        fulfillment_type = FulfillmentType(payload["fulfillment_type"])
    except KeyError as exc:
        raise QuoteValidationError("fulfillment_type is required") from exc

    delivery_location = None
    if payload.get("delivery_location"):
        delivery_location = GeoPoint(
            lat=payload["delivery_location"]["lat"],
            lng=payload["delivery_location"]["lng"],
        )

    items_payload = payload.get("items", [])
    if not items_payload:
        raise QuoteValidationError("items are required")

    request_items: list[CartLine] = []
    for line in items_payload:
        menu_item_id = line["menu_item_id"]
        quantity = line["quantity"]
        if quantity <= 0:
            raise QuoteValidationError("quantity must be greater than 0")
        menu_item = context.menu_items.get(menu_item_id)
        if menu_item is None:
            raise QuoteValidationError("menu_item_id not found")
        if menu_item.vendor_id != vendor.vendor_id:
            raise QuoteValidationError("menu_item_id does not belong to vendor")
        if not menu_item.is_available:
            raise QuoteValidationError("menu_item_id is not available")
        request_items.append(CartLine(menu_item_id=menu_item_id, quantity=quantity))

    request = QuoteRequest(
        vendor_id=vendor_id,
        fulfillment_type=fulfillment_type,
        items=request_items,
        delivery_location=delivery_location,
        delivery_comment=payload.get("delivery_comment"),
        promo_code=payload.get("promo_code"),
    )

    promotions = [
        promo
        for promo in context.promotions
        if promo.is_active and promo.promo_type in (PromotionType.FIXED_PRICE, PromotionType.PERCENT)
    ]

    quote = calculate_quote(request, vendor, context.menu_items, promotions)

    return {
        "items_subtotal": quote.items_subtotal,
        "discount_total": quote.discount_total,
        "service_fee": quote.service_fee,
        "delivery_fee": quote.delivery_fee,
        "total": quote.total,
        "promo_items_count": quote.promo_items_count,
        "combo_count": quote.combo_count,
        "buyxgety_count": quote.buyxgety_count,
        "gift_count": quote.gift_count,
    }
