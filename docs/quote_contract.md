# /client/cart/quote контракт

## Назначение
Возвращает расчет стоимости заказа с учетом правил доставки, сервисного сбора и частичных промо-акций (FIXED_PRICE, PERCENT).

## Request
`POST /client/cart/quote`

### Body
```json
{
  "vendor_id": "uuid",
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Позвонить по приезду",
  "vendor_comment": "",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2 }
  ],
  "promo_code": "OPTIONAL"
}
```

### Поля
- `vendor_id` (string, required): идентификатор точки.
- `fulfillment_type` (string, required): `DELIVERY` или `PICKUP`.
- `delivery_location` (object, required для DELIVERY):
  - `lat` (number)
  - `lng` (number)
- `delivery_comment` (string, required для DELIVERY): комментарий для курьера.
- `vendor_comment` (string, optional): комментарий для ресторана.
- `items` (array, required): позиции корзины.
  - `menu_item_id` (string)
  - `quantity` (integer, >0)
- `promo_code` (string, optional): в Phase 1 игнорируется.

## Response
### Body
```json
{
  "items_subtotal": 12000,
  "discount_total": 2000,
  "service_fee": 3000,
  "delivery_fee": 4000,
  "total": 17000,
  "promo_items_count": 1,
  "combo_count": 0,
  "buyxgety_count": 0,
  "gift_count": 0
}
```

### Поля
- `items_subtotal` (integer): сумма позиций без скидок.
- `discount_total` (integer): сумма скидок по акциям.
- `service_fee` (integer): всегда `3000`.
- `delivery_fee` (integer): `0` для PICKUP, иначе `3000 + ceil(distance_km) * 1000`.
- `total` (integer): итоговая сумма.
- `promo_items_count` (integer): количество линий товаров со скидкой в Phase 1.
- `combo_count`, `buyxgety_count`, `gift_count` (integer): в Phase 1 всегда `0`.

## Examples
### DELIVERY
```json
{
  "vendor_id": "1cfd1b2a-4b5d-4f48-a0d6-61f04f2b5f38",
  "fulfillment_type": "DELIVERY",
  "delivery_location": { "lat": 55.75, "lng": 37.62 },
  "delivery_comment": "Охрана у шлагбаума",
  "vendor_comment": "",
  "items": [
    { "menu_item_id": "b1b75d8b-48b3-45e0-9c25-5a3fbd40316b", "quantity": 2 }
  ]
}
```
```json
{
  "items_subtotal": 20000,
  "discount_total": 4000,
  "service_fee": 3000,
  "delivery_fee": 4000,
  "total": 23000,
  "promo_items_count": 1,
  "combo_count": 0,
  "buyxgety_count": 0,
  "gift_count": 0
}
```

### PICKUP
```json
{
  "vendor_id": "9d3c7f2f-7f02-4b6e-8d40-78424f9c3d6c",
  "fulfillment_type": "PICKUP",
  "items": [
    { "menu_item_id": "2369b8cc-2ac1-4f9f-8752-8e7c3a4f8aaf", "quantity": 1 }
  ]
}
```
```json
{
  "items_subtotal": 8000,
  "discount_total": 0,
  "service_fee": 3000,
  "delivery_fee": 0,
  "total": 11000,
  "promo_items_count": 0,
  "combo_count": 0,
  "buyxgety_count": 0,
  "gift_count": 0
}
```





