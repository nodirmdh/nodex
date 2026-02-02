from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import math
from typing import Iterable, Sequence


SERVICE_FEE_AMOUNT = 3000
DELIVERY_BASE_FEE = 3000
DELIVERY_PER_KM_FEE = 1000


class FulfillmentType(str, Enum):
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
    vendor_id: str
    category: VendorCategory
    supports_pickup: bool
    geo: GeoPoint


@dataclass(frozen=True)
class MenuItem:
    item_id: str
    vendor_id: str
    price: int
    is_available: bool


@dataclass(frozen=True)
class CartLine:
    menu_item_id: str
    quantity: int


@dataclass(frozen=True)
class Promotion:
    promotion_id: str
    promo_type: PromotionType
    item_ids: Sequence[str]
    value_numeric: int
    is_active: bool = True


@dataclass(frozen=True)
class QuoteRequest:
    vendor_id: str
    fulfillment_type: FulfillmentType
    items: Sequence[CartLine]
    delivery_location: GeoPoint | None = None
    delivery_comment: str | None = None
    promo_code: str | None = None


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


class QuoteValidationError(ValueError):
    status_code = 400


@dataclass(frozen=True)
class QuoteContext:
    vendors: dict[str, VendorInfo]
    menu_items: dict[str, MenuItem]
    promotions: Sequence[Promotion]


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


def calculate_delivery_fee(
    fulfillment_type: FulfillmentType,
    vendor_geo: GeoPoint,
    delivery_location: GeoPoint | None,
) -> int:
    if fulfillment_type == FulfillmentType.PICKUP:
        return 0
    if delivery_location is None:
        raise QuoteValidationError("delivery_location is required for delivery orders")
    distance_km = haversine_km(vendor_geo, delivery_location)
    return DELIVERY_BASE_FEE + math.ceil(distance_km) * DELIVERY_PER_KM_FEE


def _validate_pickup_rules(fulfillment_type: FulfillmentType, vendor: VendorInfo) -> None:
    if fulfillment_type != FulfillmentType.PICKUP:
        return
    if vendor.category != VendorCategory.RESTAURANTS or not vendor.supports_pickup:
        raise QuoteValidationError("pickup is only allowed for restaurants with pickup enabled")


def _validate_delivery_rules(request: QuoteRequest) -> None:
    if request.fulfillment_type != FulfillmentType.DELIVERY:
        return
    if request.delivery_location is None:
        raise QuoteValidationError("delivery_location is required for delivery orders")
    if not request.delivery_comment:
        raise QuoteValidationError("delivery_comment is required for delivery orders")


def _per_unit_discount(unit_price: int, promotions: Iterable[Promotion]) -> int:
    best_discount = 0
    for promo in promotions:
        if not promo.is_active:
            continue
        if promo.promo_type == PromotionType.FIXED_PRICE:
            discount = max(unit_price - promo.value_numeric, 0)
        else:
            discount = math.floor(unit_price * promo.value_numeric / 100)
        if discount > best_discount:
            best_discount = discount
    return best_discount


def _calculate_discounts(
    menu_items: dict[str, MenuItem],
    request_items: Sequence[CartLine],
    promotions: Sequence[Promotion],
) -> tuple[int, int]:
    discount_total = 0
    promo_items_count = 0
    for line in request_items:
        menu_item = menu_items[line.menu_item_id]
        applicable_promos = [
            promo for promo in promotions if line.menu_item_id in promo.item_ids and promo.is_active
        ]
        per_unit_discount = _per_unit_discount(menu_item.price, applicable_promos)
        if per_unit_discount > 0:
            promo_items_count += 1
            discount_total += per_unit_discount * line.quantity
    return discount_total, promo_items_count


def calculate_quote(
    request: QuoteRequest,
    vendor: VendorInfo,
    menu_items: dict[str, MenuItem],
    promotions: Sequence[Promotion],
) -> QuoteResult:
    _validate_pickup_rules(request.fulfillment_type, vendor)
    _validate_delivery_rules(request)

    items_subtotal = 0
    for line in request.items:
        menu_item = menu_items[line.menu_item_id]
        items_subtotal += menu_item.price * line.quantity

    discount_total, promo_items_count = _calculate_discounts(menu_items, request.items, promotions)
    delivery_fee = calculate_delivery_fee(request.fulfillment_type, vendor.geo, request.delivery_location)
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
