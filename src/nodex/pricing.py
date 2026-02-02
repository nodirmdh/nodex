from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import math
from typing import Iterable, Sequence


SERVICE_FEE_AMOUNT = 3000
DELIVERY_BASE_FEE = 3000
DELIVERY_PER_KM_FEE = 1000


class OrderType(str, Enum):
    DELIVERY = "DELIVERY"
    PICKUP = "PICKUP"


class VendorCategory(str, Enum):
    RESTAURANTS = "RESTAURANTS"
    PRODUCTS = "PRODUCTS"
    PHARMACY = "PHARMACY"
    MARKET = "MARKET"


class PromotionType(str, Enum):
    FIXED_PRICE = "FIXED_PRICE"
    PERCENT = "PERCENT"


@dataclass(frozen=True)
class GeoPoint:
    lat: float
    lng: float


@dataclass(frozen=True)
class VendorInfo:
    category: VendorCategory
    supports_pickup: bool
    geo: GeoPoint


@dataclass(frozen=True)
class CartItem:
    item_id: str
    unit_price: int
    quantity: int


@dataclass(frozen=True)
class Promotion:
    promo_type: PromotionType
    item_ids: Sequence[str]
    fixed_price_amount: int | None = None
    percent_off: int | None = None


@dataclass(frozen=True)
class QuoteRequest:
    order_type: OrderType
    vendor: VendorInfo
    items: Sequence[CartItem]
    delivery_geo: GeoPoint | None = None
    delivery_comment: str | None = None
    promotions: Sequence[Promotion] = ()


@dataclass(frozen=True)
class QuoteResult:
    items_subtotal: int
    discount_total: int
    service_fee: int
    delivery_fee: int
    total: int
    promo_items_count: int
    combo_count: int
    buyxgety_count: int
    gift_count: int


def haversine_km(origin: GeoPoint, destination: GeoPoint) -> float:
    radius_km = 6371.0
    lat1 = math.radians(origin.lat)
    lat2 = math.radians(destination.lat)
    delta_lat = math.radians(destination.lat - origin.lat)
    delta_lng = math.radians(destination.lng - origin.lng)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def calculate_delivery_fee(order_type: OrderType, vendor_geo: GeoPoint, delivery_geo: GeoPoint | None) -> int:
    if order_type == OrderType.PICKUP:
        return 0
    if delivery_geo is None:
        raise ValueError("delivery_geo is required for delivery orders")
    distance_km = haversine_km(vendor_geo, delivery_geo)
    return DELIVERY_BASE_FEE + math.ceil(distance_km) * DELIVERY_PER_KM_FEE


def _validate_pickup_rules(request: QuoteRequest) -> None:
    if request.order_type != OrderType.PICKUP:
        return
    if request.vendor.category != VendorCategory.RESTAURANTS or not request.vendor.supports_pickup:
        raise ValueError("pickup orders are only allowed for restaurants with pickup enabled")


def _validate_delivery_rules(request: QuoteRequest) -> None:
    if request.order_type != OrderType.DELIVERY:
        return
    if request.delivery_geo is None:
        raise ValueError("delivery_geo is required for delivery orders")
    if not request.delivery_comment:
        raise ValueError("delivery_comment is required for delivery orders")


def _validate_promotions(promotions: Iterable[Promotion]) -> None:
    for promo in promotions:
        if promo.promo_type not in (PromotionType.FIXED_PRICE, PromotionType.PERCENT):
            raise ValueError(f"unsupported promotion type: {promo.promo_type}")
        if promo.promo_type == PromotionType.FIXED_PRICE and promo.fixed_price_amount is None:
            raise ValueError("fixed_price_amount is required for FIXED_PRICE promotions")
        if promo.promo_type == PromotionType.PERCENT and promo.percent_off is None:
            raise ValueError("percent_off is required for PERCENT promotions")


def _per_unit_discount(item: CartItem, promotions: Iterable[Promotion]) -> int:
    best_discount = 0
    for promo in promotions:
        if item.item_id not in promo.item_ids:
            continue
        if promo.promo_type == PromotionType.FIXED_PRICE:
            discount = max(item.unit_price - (promo.fixed_price_amount or 0), 0)
        else:
            percent = promo.percent_off or 0
            discount = math.floor(item.unit_price * percent / 100)
        if discount > best_discount:
            best_discount = discount
    return best_discount


def calculate_quote(request: QuoteRequest) -> QuoteResult:
    _validate_pickup_rules(request)
    _validate_delivery_rules(request)
    _validate_promotions(request.promotions)

    items_subtotal = sum(item.unit_price * item.quantity for item in request.items)

    discount_total = 0
    promo_items_count = 0
    for item in request.items:
        per_unit_discount = _per_unit_discount(item, request.promotions)
        if per_unit_discount > 0:
            promo_items_count += item.quantity
            discount_total += per_unit_discount * item.quantity

    delivery_fee = calculate_delivery_fee(request.order_type, request.vendor.geo, request.delivery_geo)
    total = items_subtotal - discount_total + SERVICE_FEE_AMOUNT + delivery_fee

    return QuoteResult(
        items_subtotal=items_subtotal,
        discount_total=discount_total,
        service_fee=SERVICE_FEE_AMOUNT,
        delivery_fee=delivery_fee,
        total=total,
        promo_items_count=promo_items_count,
        combo_count=0,
        buyxgety_count=0,
        gift_count=0,
    )
