from __future__ import annotations

from typing import Any, Dict, Iterable

from .pricing import (
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


def _parse_promotions(raw_promotions: Iterable[Dict[str, Any]]) -> list[Promotion]:
    promotions: list[Promotion] = []
    for promo in raw_promotions:
        promo_type = PromotionType(promo["type"])
        item_ids = promo.get("item_ids", [])
        promotions.append(
            Promotion(
                promo_type=promo_type,
                item_ids=item_ids,
                fixed_price_amount=promo.get("fixed_price_amount"),
                percent_off=promo.get("percent_off"),
            )
        )
    return promotions


def build_quote_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    vendor = VendorInfo(
        category=VendorCategory(payload["vendor"]["category"]),
        supports_pickup=payload["vendor"]["supports_pickup"],
        geo=GeoPoint(
            lat=payload["vendor"]["geo"]["lat"],
            lng=payload["vendor"]["geo"]["lng"],
        ),
    )

    delivery_geo = None
    if payload.get("delivery_geo"):
        delivery_geo = GeoPoint(
            lat=payload["delivery_geo"]["lat"],
            lng=payload["delivery_geo"]["lng"],
        )

    items = [
        CartItem(
            item_id=item["item_id"],
            unit_price=item["unit_price"],
            quantity=item["quantity"],
        )
        for item in payload["items"]
    ]

    request = QuoteRequest(
        order_type=OrderType(payload["order_type"]),
        vendor=vendor,
        items=items,
        delivery_geo=delivery_geo,
        delivery_comment=payload.get("delivery_comment"),
        promotions=_parse_promotions(payload.get("promotions", [])),
    )

    quote = calculate_quote(request)

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
