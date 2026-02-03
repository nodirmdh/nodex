import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

import { QuoteNotFoundError, QuotePayload, buildQuoteRequest, quoteCart } from "./quote";
import {
  QuoteValidationError,
  QuoteContext,
  FulfillmentType,
  Promotion,
  calculateQuote,
} from "./pricing";
import { buildQuoteContextFromRepository, QuoteContextRepository } from "./quoteContext";
import { PrismaQuoteRepository } from "./repositories/prismaQuoteRepository";
import { PrismaClient } from "@prisma/client";
import { generateNumericCode, hashCode, verifyCode } from "./codes";
import { OrderStatus, assertTransition } from "./orderState";
import { createRateLimiter, RateLimitError } from "./rateLimit";
import { buildOrderSnapshot } from "./orderSnapshot";
import {
  AuthError,
  requireAdminFromHeaders,
  signAdminToken,
  validateAdminCredentials,
} from "./adminAuth";

type BuildServerOptions = {
  quoteContextBuilder?: (
    vendorId: string,
    menuItemIds: string[],
    promoCode?: string | null,
  ) => Promise<QuoteContext>;
  repository?: QuoteContextRepository;
};

type Role = "ADMIN" | "CLIENT" | "COURIER" | "VENDOR";

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const prisma = options.repository ? null : new PrismaClient();
  const quoteRepository =
    options.repository ?? new PrismaQuoteRepository(prisma as PrismaClient);
  const quoteContextBuilder =
    options.quoteContextBuilder ??
    ((vendorId, menuItemIds, promoCode) =>
      buildQuoteContextFromRepository(quoteRepository, vendorId, menuItemIds, promoCode));

  const codeLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    maxAttempts: 5,
  });

  void app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-role", "x-client-id", "x-courier-id", "x-vendor-id"],
  });

  app.post("/client/cart/quote", async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    const menuItemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const menuItemIds = menuItemsPayload
      .map((item) => (item as { menu_item_id?: string }).menu_item_id)
      .filter((itemId): itemId is string => Boolean(itemId));

    const vendorId = typeof payload.vendor_id === "string" ? payload.vendor_id : "";
    const promoCode = typeof payload.promo_code === "string" ? payload.promo_code : null;
    const context = await quoteContextBuilder(vendorId, menuItemIds, promoCode);

    try {
      const result = quoteCart(payload, context);
      if (promoCode && !result.promo_code) {
        return reply.status(400).send({ message: "promo_code is invalid" });
      }
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof QuoteNotFoundError) {
        return reply.status(404).send({ message: error.message });
      }
      if (error instanceof QuoteValidationError) {
        return reply.status(400).send({ message: error.message });
      }
      request.log.error({ err: error }, "Unhandled error during quote");
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.post("/admin/auth/login", async (request, reply) => {
    const payload = request.body as { username?: string; password?: string };
    if (!payload.username || !payload.password) {
      return reply.status(400).send({ message: "username and password are required" });
    }

    try {
      const isValid = validateAdminCredentials(payload.username, payload.password);
      if (!isValid) {
        return reply.status(401).send({ message: "invalid credentials" });
      }
      const token = signAdminToken();
      return reply.send({ token });
    } catch (error) {
      request.log.error({ err: error }, "Admin auth failed");
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.post("/client/orders", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const payload = request.body as QuotePayload;
    const menuItemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const menuItemIds = menuItemsPayload
      .map((item) => item.menu_item_id)
      .filter((itemId): itemId is string => Boolean(itemId));
    const vendorId = payload.vendor_id ?? "";

    const promoCode = typeof payload.promo_code === "string" ? payload.promo_code : null;
    const context = await quoteContextBuilder(vendorId, menuItemIds, promoCode);

    try {
      const quoteRequest = buildQuoteRequest(payload, context);
      const vendor = context.vendors[quoteRequest.vendorId];
      if (!vendor) {
        throw new QuoteNotFoundError("vendor not found");
      }
      const promotions = context.promotions.filter((promo) => promo.isActive) as Promotion[];
      const quote = calculateQuote(
        quoteRequest,
        vendor,
        context.menuItems,
        promotions,
        context.promoCode ?? null,
      );
      if (promoCode && !quote.promoCodeApplied) {
        return reply.status(400).send({ message: "promo_code is invalid" });
      }
      const snapshot = buildOrderSnapshot(quote);

      const pickupCode = generateNumericCode();
      const deliveryCode = generateNumericCode();
      const pickupHash = hashCode(pickupCode);
      const deliveryHash = hashCode(deliveryCode);

      const clientId = readHeader(request, "x-client-id");

      const order = await (prisma as PrismaClient).$transaction(async (tx) => {
        if (context.promoCode && quote.promoCodeApplied && context.promoCode.usageLimit !== null) {
          const updated = await tx.promoCode.updateMany({
            where: {
              id: context.promoCode.id,
              usedCount: { lt: context.promoCode.usageLimit },
            },
            data: { usedCount: { increment: 1 } },
          });
          if (updated.count === 0) {
            throw new QuoteValidationError("promo_code usage limit reached");
          }
        } else if (context.promoCode && quote.promoCodeApplied) {
          await tx.promoCode.update({
            where: { id: context.promoCode.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        return tx.order.create({
          data: {
            vendorId: quoteRequest.vendorId,
            clientId: clientId ?? null,
            fulfillmentType: quoteRequest.fulfillmentType,
            status: OrderStatus.NEW,
            deliveryLat: quoteRequest.deliveryLocation?.lat ?? null,
            deliveryLng: quoteRequest.deliveryLocation?.lng ?? null,
            deliveryComment: quoteRequest.deliveryComment ?? null,
            vendorComment: payload.vendor_comment ?? null,
            itemsSubtotal: snapshot.itemsSubtotal,
            discountTotal: snapshot.discountTotal,
            promoCodeId: context.promoCode?.id ?? null,
            promoCodeType: context.promoCode?.type ?? null,
            promoCodeValue: context.promoCode?.value ?? null,
            promoCodeDiscount: snapshot.promoCodeDiscount,
            serviceFee: snapshot.serviceFee,
            deliveryFee: snapshot.deliveryFee,
            total: snapshot.total,
            promoItemsCount: snapshot.promoItemsCount,
            comboCount: snapshot.comboCount,
            buyxgetyCount: snapshot.buyxgetyCount,
            giftCount: snapshot.giftCount,
            pickupCodeHash: pickupHash.hash,
            pickupCodeSalt: pickupHash.salt,
            deliveryCodeHash: deliveryHash.hash,
            deliveryCodeSalt: deliveryHash.salt,
            items: {
              create: quote.lineItems.map((item) => ({
                menuItemId: item.menuItemId,
                price: item.unitPrice,
                quantity: item.quantity,
                isGift: item.isGift,
                discountAmount: item.discountAmount,
              })),
            },
            events: {
              create: {
                eventType: "order_created",
                payload: {
                  fulfillment_type: quoteRequest.fulfillmentType,
                },
              },
            },
          },
        });
      });

      return reply.status(201).send({
        order_id: order.id,
        status: order.status,
        items_subtotal: order.itemsSubtotal,
        discount_total: order.discountTotal,
        promo_code: quote.promoCode,
        promo_code_discount: quote.promoCodeDiscount,
        service_fee: order.serviceFee,
        delivery_fee: order.deliveryFee,
        total: order.total,
        promo_items_count: order.promoItemsCount,
        combo_count: order.comboCount,
        buyxgety_count: order.buyxgetyCount,
        gift_count: order.giftCount,
        delivery_code:
          quoteRequest.fulfillmentType === FulfillmentType.DELIVERY ? deliveryCode : null,
      });
    } catch (error) {
      if (error instanceof QuoteNotFoundError) {
        return reply.status(404).send({ message: error.message });
      }
      if (error instanceof QuoteValidationError) {
        return reply.status(400).send({ message: error.message });
      }
      request.log.error({ err: error }, "Unhandled error during order creation");
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/client/orders/:orderId", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: { items: true, promoCode: true },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    const clientId = readHeader(request, "x-client-id");
    if (role === "CLIENT" && order.clientId && order.clientId !== clientId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    return reply.send({
      order_id: order.id,
      status: order.status,
      vendor_id: order.vendorId,
      fulfillment_type: order.fulfillmentType,
      delivery_location:
        order.deliveryLat !== null && order.deliveryLng !== null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
      delivery_comment: order.deliveryComment,
      vendor_comment: order.vendorComment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        discount_amount: item.discountAmount,
        is_gift: item.isGift,
      })),
      items_subtotal: order.itemsSubtotal,
      discount_total: order.discountTotal,
      promo_code: order.promoCode?.code ?? null,
      promo_code_discount: order.promoCodeDiscount,
      service_fee: order.serviceFee,
      delivery_fee: order.deliveryFee,
      total: order.total,
    });
  });

  app.get("/client/orders/:orderId/tracking", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    const clientId = readHeader(request, "x-client-id");
    if (role === "CLIENT" && order.clientId && order.clientId !== clientId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    if (order.status !== OrderStatus.COURIER_ACCEPTED && order.status !== OrderStatus.PICKED_UP) {
      return reply.send({
        order_id: order.id,
        courier_id: order.courierId,
        location: null,
        updated_at: null,
      });
    }

    const latest = await (prisma as PrismaClient).orderTracking.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      order_id: order.id,
      courier_id: order.courierId,
      location: latest ? { lat: latest.lat, lng: latest.lng } : null,
      updated_at: latest?.createdAt ?? null,
    });
  });

  app.post("/courier/orders/:orderId/accept", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

    const courierId = readHeader(request, "x-courier-id");
    if (!courierId && !order.courierId && role !== "ADMIN") {
      return reply.status(400).send({ message: "x-courier-id is required" });
    }
    if (order.courierId && courierId && order.courierId !== courierId && role !== "ADMIN") {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertTransition(
        order.status as OrderStatus,
        OrderStatus.COURIER_ACCEPTED,
        "COURIER",
        order.fulfillmentType as FulfillmentType,
      );
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(409).send({ message: error.message });
      }
    }

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COURIER_ACCEPTED,
        courierId: order.courierId ?? courierId ?? null,
        events: {
          create: {
            eventType: "courier_accepted",
          },
        },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.get("/courier/orders/available", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        fulfillmentType: FulfillmentType.DELIVERY,
        status: OrderStatus.READY,
        courierId: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        vendor_id: order.vendorId,
        status: order.status,
        items_subtotal: order.itemsSubtotal,
        total: order.total,
      })),
    });
  });

  app.post("/courier/orders/:orderId/pickup", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { pickup_code?: string };
    if (!payload.pickup_code) {
      return reply.status(400).send({ message: "pickup_code is required" });
    }

    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

    const courierId = readHeader(request, "x-courier-id");
    if (order.courierId && courierId && order.courierId !== courierId && role !== "ADMIN") {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertTransition(
        order.status as OrderStatus,
        OrderStatus.PICKED_UP,
        "COURIER",
        order.fulfillmentType as FulfillmentType,
      );
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(409).send({ message: error.message });
      }
    }

    try {
      codeLimiter.check(`pickup:${order.id}:${courierId ?? "unknown"}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.status(429).send({ message: "too many attempts" });
      }
    }

    const isValid = verifyCode(payload.pickup_code, order.pickupCodeHash, order.pickupCodeSalt);
    if (!isValid) {
      return reply.status(400).send({ message: "invalid pickup code" });
    }
    codeLimiter.reset(`pickup:${order.id}:${courierId ?? "unknown"}`);

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PICKED_UP,
        events: {
          create: {
            eventType: "courier_picked_up",
          },
        },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.post("/courier/orders/:orderId/deliver", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { delivery_code?: string };
    if (!payload.delivery_code) {
      return reply.status(400).send({ message: "delivery_code is required" });
    }

    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

    const courierId = readHeader(request, "x-courier-id");
    if (order.courierId && courierId && order.courierId !== courierId && role !== "ADMIN") {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertTransition(
        order.status as OrderStatus,
        OrderStatus.DELIVERED,
        "COURIER",
        order.fulfillmentType as FulfillmentType,
      );
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(409).send({ message: error.message });
      }
    }

    try {
      codeLimiter.check(`deliver:${order.id}:${courierId ?? "unknown"}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.status(429).send({ message: "too many attempts" });
      }
    }

    const isValid = verifyCode(
      payload.delivery_code,
      order.deliveryCodeHash,
      order.deliveryCodeSalt,
    );
    if (!isValid) {
      return reply.status(400).send({ message: "invalid delivery code" });
    }
    codeLimiter.reset(`deliver:${order.id}:${courierId ?? "unknown"}`);

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.DELIVERED,
        events: {
          create: {
            eventType: "courier_delivered",
          },
        },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.post("/courier/orders/:orderId/location", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { lat?: number; lng?: number };
    if (typeof payload.lat !== "number" || typeof payload.lng !== "number") {
      return reply.status(400).send({ message: "lat and lng are required" });
    }

    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.status !== OrderStatus.COURIER_ACCEPTED && order.status !== OrderStatus.PICKED_UP) {
      return reply.status(409).send({ message: "order is not active for tracking" });
    }

    const courierId = readHeader(request, "x-courier-id");
    if (order.courierId && courierId && order.courierId !== courierId && role !== "ADMIN") {
      return reply.status(403).send({ message: "Forbidden" });
    }
    if (!order.courierId && role !== "ADMIN") {
      return reply.status(400).send({ message: "order has no courier assigned" });
    }

    await (prisma as PrismaClient).orderTracking.create({
      data: {
        orderId: order.id,
        courierId: order.courierId ?? courierId ?? "",
        lat: payload.lat,
        lng: payload.lng,
      },
    });

    return reply.send({ order_id: order.id, status: order.status });
  });

  app.get("/vendor/orders/active", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId: role === "ADMIN" ? undefined : vendorId,
        status: { in: [OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.COOKING, OrderStatus.READY] },
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return reply.send({ orders: orders.map(mapOrderSummary) });
  });

  app.get("/vendor/orders/history", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId: role === "ADMIN" ? undefined : vendorId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.CANCELLED_BY_VENDOR, OrderStatus.PICKED_UP_BY_CUSTOMER] },
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return reply.send({ orders: orders.map(mapOrderSummary) });
  });

  app.post("/vendor/orders/:orderId/accept", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && order.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertTransition(order.status as OrderStatus, OrderStatus.ACCEPTED, "VENDOR", order.fulfillmentType as FulfillmentType);
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(409).send({ message: error.message });
      }
    }

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.ACCEPTED,
        events: { create: { eventType: "vendor_accepted" } },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.post("/vendor/orders/:orderId/status", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const payload = request.body as { status?: OrderStatus };
    const nextStatus = payload.status;
    if (!nextStatus) {
      return reply.status(400).send({ message: "status is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && order.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertTransition(order.status as OrderStatus, nextStatus, "VENDOR", order.fulfillmentType as FulfillmentType);
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(409).send({ message: error.message });
      }
    }

    const eventType = nextStatus === OrderStatus.READY ? "order_ready" : "vendor_status_updated";
    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        events: { create: { eventType } },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.get("/admin/vendors", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendors = await (prisma as PrismaClient).vendor.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      vendors: vendors.map((vendor) => ({
        vendor_id: vendor.id,
        category: vendor.category,
        supports_pickup: vendor.supportsPickup,
        address_text: vendor.addressText,
        geo: { lat: vendor.geoLat, lng: vendor.geoLng },
        created_at: vendor.createdAt,
      })),
    });
  });

  app.post("/admin/vendors", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const payload = request.body as {
      category?: string;
      supports_pickup?: boolean;
      address_text?: string;
      geo?: { lat?: number; lng?: number };
    };

    if (!payload.category) {
      return reply.status(400).send({ message: "category is required" });
    }
    if (!payload.geo || typeof payload.geo.lat !== "number" || typeof payload.geo.lng !== "number") {
      return reply.status(400).send({ message: "geo.lat and geo.lng are required" });
    }

    const vendor = await (prisma as PrismaClient).vendor.create({
      data: {
        category: payload.category as string,
        supportsPickup: payload.supports_pickup ?? false,
        addressText: payload.address_text ?? null,
        geoLat: payload.geo.lat,
        geoLng: payload.geo.lng,
      },
    });

    return reply.status(201).send({
      vendor_id: vendor.id,
      category: vendor.category,
      supports_pickup: vendor.supportsPickup,
      address_text: vendor.addressText,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
      created_at: vendor.createdAt,
    });
  });

  app.get("/admin/orders", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const query = request.query as {
      status?: string;
      vendor_id?: string;
      fulfillment_type?: string;
    };

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        status: query.status ? (query.status as OrderStatus) : undefined,
        vendorId: query.vendor_id ?? undefined,
        fulfillmentType: query.fulfillment_type ? (query.fulfillment_type as FulfillmentType) : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        status: order.status,
        vendor_id: order.vendorId,
        fulfillment_type: order.fulfillmentType,
        items_subtotal: order.itemsSubtotal,
        total: order.total,
        delivery_comment: order.deliveryComment,
        vendor_comment: order.vendorComment,
        created_at: order.createdAt,
      })),
    });
  });

  app.get("/admin/orders/:orderId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: { items: true, events: true, tracking: true },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    return reply.send({
      order_id: order.id,
      status: order.status,
      vendor_id: order.vendorId,
      client_id: order.clientId,
      courier_id: order.courierId,
      fulfillment_type: order.fulfillmentType,
      delivery_location:
        order.deliveryLat !== null && order.deliveryLng !== null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
      delivery_comment: order.deliveryComment,
      vendor_comment: order.vendorComment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        discount_amount: item.discountAmount,
        is_gift: item.isGift,
      })),
      items_subtotal: order.itemsSubtotal,
      discount_total: order.discountTotal,
      service_fee: order.serviceFee,
      delivery_fee: order.deliveryFee,
      total: order.total,
      promo_items_count: order.promoItemsCount,
      combo_count: order.comboCount,
      buyxgety_count: order.buyxgetyCount,
      gift_count: order.giftCount,
      events: order.events
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((event) => ({
          event_type: event.eventType,
          payload: event.payload,
          created_at: event.createdAt,
        })),
      tracking: order.tracking
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((entry) => ({
          courier_id: entry.courierId,
          location: { lat: entry.lat, lng: entry.lng },
          created_at: entry.createdAt,
        })),
    });
  });

  app.get("/admin/promotions", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const query = request.query as { vendor_id?: string };

    const promotions = await (prisma as PrismaClient).promotion.findMany({
      where: {
        vendorId: query.vendor_id ?? undefined,
      },
      include: {
        promotionItems: true,
        comboItems: true,
        buyXGetY: true,
        gift: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      promotions: promotions.map((promo) => ({
        promotion_id: promo.id,
        vendor_id: promo.vendorId,
        promo_type: promo.promoType,
        value_numeric: promo.valueNumeric,
        is_active: promo.isActive,
        starts_at: promo.startsAt,
        ends_at: promo.endsAt,
        items: promo.promotionItems.map((item) => item.menuItemId),
        combo_items: promo.comboItems.map((item) => ({
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
        })),
        buy_x_get_y: promo.buyXGetY
          ? {
              buy_item_id: promo.buyXGetY.buyItemId,
              buy_quantity: promo.buyXGetY.buyQuantity,
              get_item_id: promo.buyXGetY.getItemId,
              get_quantity: promo.buyXGetY.getQuantity,
              discount_percent: promo.buyXGetY.discountPercent,
            }
          : null,
        gift: promo.gift
          ? {
              gift_item_id: promo.gift.giftItemId,
              gift_quantity: promo.gift.giftQuantity,
              min_order_amount: promo.gift.minOrderAmount,
            }
          : null,
      })),
    });
  });

  app.post("/admin/promo-codes", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const payload = request.body as {
      code?: string;
      type?: "PERCENT" | "FIXED";
      value?: number;
      is_active?: boolean;
      starts_at?: string;
      ends_at?: string;
      usage_limit?: number | null;
      min_order_sum?: number | null;
    };

    if (!payload.code || !payload.type || typeof payload.value !== "number") {
      return reply.status(400).send({ message: "code, type, and value are required" });
    }

    const promo = await (prisma as PrismaClient).promoCode.create({
      data: {
        code: payload.code,
        type: payload.type,
        value: payload.value,
        isActive: payload.is_active ?? true,
        startsAt: payload.starts_at ? new Date(payload.starts_at) : null,
        endsAt: payload.ends_at ? new Date(payload.ends_at) : null,
        usageLimit: payload.usage_limit ?? null,
        minOrderSum: payload.min_order_sum ?? null,
      },
    });

    return reply.status(201).send(mapPromoCode(promo));
  });

  app.get("/admin/promo-codes", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const promoCodes = await (prisma as PrismaClient).promoCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ promo_codes: promoCodes.map(mapPromoCode) });
  });

  app.patch("/admin/promo-codes/:id", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const promoId = (request.params as { id: string }).id;
    const payload = request.body as {
      code?: string;
      type?: "PERCENT" | "FIXED";
      value?: number;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      usage_limit?: number | null;
      min_order_sum?: number | null;
    };

    const promo = await (prisma as PrismaClient).promoCode.update({
      where: { id: promoId },
      data: {
        code: payload.code,
        type: payload.type,
        value: payload.value,
        isActive: payload.is_active,
        startsAt: payload.starts_at === undefined ? undefined : payload.starts_at ? new Date(payload.starts_at) : null,
        endsAt: payload.ends_at === undefined ? undefined : payload.ends_at ? new Date(payload.ends_at) : null,
        usageLimit: payload.usage_limit === undefined ? undefined : payload.usage_limit,
        minOrderSum: payload.min_order_sum === undefined ? undefined : payload.min_order_sum,
      },
    });

    return reply.send(mapPromoCode(promo));
  });

  app.delete("/admin/promo-codes/:id", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const promoId = (request.params as { id: string }).id;
    await (prisma as PrismaClient).promoCode.delete({ where: { id: promoId } });
    return reply.send({ deleted: true });
  });

  app.post("/client/profile/promo-codes", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = readHeader(request, "x-client-id");
    if (!clientId) {
      return reply.status(400).send({ message: "x-client-id is required" });
    }

    const payload = request.body as { code?: string };
    if (!payload.code) {
      return reply.status(400).send({ message: "code is required" });
    }

    const promo = await (prisma as PrismaClient).promoCode.findUnique({
      where: { code: payload.code },
    });
    if (!promo || !promo.isActive) {
      return reply.status(404).send({ message: "promo code not found" });
    }

    const entry = await (prisma as PrismaClient).clientPromoCode.upsert({
      where: { clientId_promoCodeId: { clientId, promoCodeId: promo.id } },
      update: {},
      create: { clientId, promoCodeId: promo.id },
      include: { promoCode: true },
    });

    return reply.send({
      id: entry.id,
      code: entry.promoCode.code,
      type: entry.promoCode.type,
      value: entry.promoCode.value,
    });
  });

  app.get("/client/profile/promo-codes", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = readHeader(request, "x-client-id");
    if (!clientId) {
      return reply.status(400).send({ message: "x-client-id is required" });
    }

    const entries = await (prisma as PrismaClient).clientPromoCode.findMany({
      where: { clientId },
      include: { promoCode: true },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      promo_codes: entries.map((entry) => ({
        id: entry.id,
        code: entry.promoCode.code,
        type: entry.promoCode.type,
        value: entry.promoCode.value,
        is_active: entry.promoCode.isActive,
      })),
    });
  });

  app.delete("/client/profile/promo-codes/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = readHeader(request, "x-client-id");
    if (!clientId) {
      return reply.status(400).send({ message: "x-client-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const entry = await (prisma as PrismaClient).clientPromoCode.findUnique({
      where: { id },
    });
    if (!entry || entry.clientId !== clientId) {
      return reply.status(404).send({ message: "promo code not found" });
    }

    await (prisma as PrismaClient).clientPromoCode.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  app.addHook("onClose", async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  return app;
}

function readHeader(request: { headers: Record<string, string | string[] | undefined> }, key: string) {
  const value = request.headers[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readRole(request: { headers: Record<string, string | string[] | undefined> }): Role | null {
  const raw = readHeader(request, "x-role");
  if (raw === "ADMIN" || raw === "CLIENT" || raw === "COURIER" || raw === "VENDOR") {
    return raw;
  }
  return null;
}

function handleAdminAuthError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode ?? 401).send({ message: error.message });
  }
  return reply.status(401).send({ message: "Unauthorized" });
}

function mapOrderSummary(order: {
  id: string;
  status: string;
  vendorId: string;
  fulfillmentType: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryComment: string | null;
  vendorComment: string | null;
  promoCodeDiscount?: number;
  itemsSubtotal: number;
  discountTotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    menuItemId: string;
    quantity: number;
    price: number;
    discountAmount: number;
    isGift: boolean;
  }>;
}) {
  return {
    order_id: order.id,
    status: order.status,
    vendor_id: order.vendorId,
    fulfillment_type: order.fulfillmentType,
    delivery_location:
      order.deliveryLat !== null && order.deliveryLng !== null
        ? { lat: order.deliveryLat, lng: order.deliveryLng }
        : null,
    delivery_comment: order.deliveryComment,
    vendor_comment: order.vendorComment,
    items: order.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      discount_amount: item.discountAmount,
      is_gift: item.isGift,
    })),
    items_subtotal: order.itemsSubtotal,
    discount_total: order.discountTotal,
    promo_code_discount: order.promoCodeDiscount ?? 0,
    service_fee: order.serviceFee,
    delivery_fee: order.deliveryFee,
    total: order.total,
  };
}

function mapPromoCode(promo: {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  minOrderSum: number | null;
}) {
  return {
    id: promo.id,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    is_active: promo.isActive,
    starts_at: promo.startsAt,
    ends_at: promo.endsAt,
    usage_limit: promo.usageLimit,
    used_count: promo.usedCount,
    min_order_sum: promo.minOrderSum,
  };
}
