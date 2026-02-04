import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

import { QuoteNotFoundError, QuotePayload, buildQuoteRequest, quoteCart } from "./quote";
import {
  QuoteValidationError,
  QuoteContext,
  FulfillmentType,
  Promotion,
  VendorCategory,
  calculateQuote,
} from "./pricing";
import { buildQuoteContextFromRepository, QuoteContextRepository } from "./quoteContext";
import { PrismaQuoteRepository } from "./repositories/prismaQuoteRepository";
import { PrismaClient, PromotionType, DeliveryMethod } from "@prisma/client";
import { generateNumericCode, hashCode, normalizeNumericCode, verifyCode } from "./codes";
import { OrderStatus, assertTransition, canTransition } from "./orderState";
import { createRateLimiter, RateLimitError } from "./rateLimit";
import { buildOrderSnapshot } from "./orderSnapshot";
import {
  AuthError,
  requireAdminFromHeaders,
  signAdminToken,
  validateAdminCredentials,
} from "./adminAuth";
import { normalizeUzPhone } from "./phone";
import {
  PromoAlreadyUsedError,
  assertPromoNotRedeemed,
  isPromoRedemptionConflict,
  promoCodeStatus,
} from "./promoRedemption";
import {
  applyRatingAggregate,
  assertRateableStatus,
  validateStars,
} from "./ratings";
import { filterAvailableMenu } from "./clientMenu";
import { computeVendorDashboard } from "./vendorDashboard";
import { computeFinanceByVendor, computeFinanceSummary } from "./adminFinance";
import {
  buildActivePromotionBadges,
  formatPromotionBadge,
  isPromotionActiveNow,
} from "./promotionVisibility";
import { computeCourierBalance, mapCourierHistoryOrder } from "./courierAggregates";

type BuildServerOptions = {
  quoteContextBuilder?: (
    vendorId: string,
    menuItemIds: string[],
    promoCode?: string | null,
  ) => Promise<QuoteContext>;
  repository?: QuoteContextRepository;
};

type Role = "ADMIN" | "CLIENT" | "COURIER" | "VENDOR";

const DEV_MODE =
  process.env.DEV_MODE === "true" ||
  process.env.DEV_MODE === "1" ||
  process.env.NODE_ENV === "test";
const DEV_CLIENT_ID = process.env.DEV_CLIENT_ID ?? "dev-client-1";
const DEV_COURIER_ID = process.env.DEV_COURIER_ID ?? "dev-courier-1";
const DEV_USER_HEADER = "x-dev-user";

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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-role",
      "x-client-id",
      "x-courier-id",
      "x-vendor-id",
      "x-telegram-init-data",
      "x-dev-user",
    ],
  });

  app.post("/client/cart/quote", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as Record<string, unknown>;
    const receiverPhoneRaw =
      typeof payload.receiver_phone === "string" ? payload.receiver_phone : null;
    const normalizedPhone = normalizeUzPhone(receiverPhoneRaw);
    if (receiverPhoneRaw && !normalizedPhone) {
      return reply
        .status(400)
        .send({ message: "receiver_phone must start with +998", code: "INVALID_PHONE" });
    }
    const menuItemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const menuItemIds = menuItemsPayload
      .map((item) => (item as { menu_item_id?: string }).menu_item_id)
      .filter((itemId): itemId is string => Boolean(itemId));

    const vendorId = typeof payload.vendor_id === "string" ? payload.vendor_id : "";
    const promoCode = normalizePromoCode(
      typeof payload.promo_code === "string" ? payload.promo_code : null,
    );
    const context = await quoteContextBuilder(vendorId, menuItemIds, promoCode);
    if (promoCode && context.promoCode && clientId && prisma) {
      const redeemed = await (prisma as PrismaClient).promoCodeRedemption.findUnique({
        where: { promoCodeId_clientId: { promoCodeId: context.promoCode.id, clientId } },
      });
      try {
        assertPromoNotRedeemed(Boolean(redeemed));
      } catch (error) {
        if (error instanceof PromoAlreadyUsedError) {
          return reply.status(400).send({ message: error.message, code: error.code });
        }
        throw error;
      }
    }

    try {
      const result = quoteCart(payload, context);
      if (promoCode && !result.promo_code) {
        const message = promoCodeErrorMessage(
          context.promoCode ?? null,
          result.items_subtotal,
          result.discount_total,
        );
        const statusCode = message === "promo_code not found" ? 404 : 400;
        return reply.status(statusCode).send({ message });
      }
      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof QuoteNotFoundError) {
        return reply.status(404).send({ message: error.message });
      }
      if (error instanceof QuoteValidationError) {
        return reply
          .status(400)
          .send({ message: error.message, ...(error.code ? { code: error.code } : {}) });
      }
      request.log.error({ err: error }, "Unhandled error during quote");
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/client/categories", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    return reply.send({ categories: Object.values(VendorCategory) });
  });

  app.get("/client/vendors", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const now = new Date();
    const [vendors, activePromoCode] = await Promise.all([
      (prisma as PrismaClient).vendor.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          promotions: { where: { isActive: true } },
        },
      }),
      (prisma as PrismaClient).promoCode.findFirst({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        select: { id: true },
      }),
    ]);
    const promoCodeAvailable = Boolean(activePromoCode);

    return reply.send({
      vendors: vendors.map((vendor) => ({
        vendor_id: vendor.id,
        category: vendor.category,
        supports_pickup: vendor.supportsPickup,
        address_text: vendor.addressText,
        geo: { lat: vendor.geoLat, lng: vendor.geoLng },
        name: vendor.name ?? vendor.addressText ?? `Vendor ${vendor.id.slice(0, 6)}`,
        description: vendor.description ?? null,
        rating_avg: vendor.ratingAvg ?? 0,
        rating_count: vendor.ratingCount ?? 0,
        active_promotions: buildActivePromotionBadges(
          vendor.promotions,
          promoCodeAvailable,
          now,
        ),
      })),
    });
  });

  app.get("/client/vendors/:vendorId", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const now = new Date();
    const vendor = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: vendorId },
      include: {
        menuItems: true,
        promotions: {
          include: {
            promotionItems: true,
            comboItems: true,
            buyXGetY: true,
            gift: true,
          },
        },
      },
    });

    if (!vendor) {
      return reply.status(404).send({ message: "vendor not found" });
    }

    const [activePromos, activePromoCode] = await Promise.all([
      Promise.resolve(vendor.promotions.filter((promo) => isPromotionActiveNow(promo, now))),
      (prisma as PrismaClient).promoCode.findFirst({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        select: { id: true },
      }),
    ]);
    const promoCodeAvailable = Boolean(activePromoCode);

    const menu = filterAvailableMenu(vendor.menuItems).map((item) => {
      const promoBadges = new Set<string>();
      for (const promo of activePromos) {
        if (
          promo.promotionItems.some((link) => link.menuItemId === item.id) ||
          promo.comboItems.some((link) => link.menuItemId === item.id) ||
          promo.buyXGetY?.buyItemId === item.id ||
          promo.buyXGetY?.getItemId === item.id ||
          promo.gift?.giftItemId === item.id
        ) {
          promoBadges.add(formatPromotionBadge(promo.promoType, promo.valueNumeric));
        }
      }
      return {
        menu_item_id: item.id,
        price: item.price,
        is_available: item.isAvailable,
        title: item.title,
        description: item.description,
        weight_value: item.weightValue,
        weight_unit: item.weightUnit,
        promo_badges: Array.from(promoBadges),
      };
    });

    return reply.send({
      vendor_id: vendor.id,
      category: vendor.category,
      supports_pickup: vendor.supportsPickup,
      address_text: vendor.addressText,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
      name: vendor.name ?? vendor.addressText ?? `Vendor ${vendor.id.slice(0, 6)}`,
      description: vendor.description ?? null,
      rating_avg: vendor.ratingAvg ?? 0,
      rating_count: vendor.ratingCount ?? 0,
      active_promotions: buildActivePromotionBadges(activePromos, promoCodeAvailable, now),
      menu,
    });
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

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as QuotePayload;
    const normalizedPhone = normalizeUzPhone(payload.receiver_phone ?? null);
    if (payload.receiver_phone && !normalizedPhone) {
      return reply
        .status(400)
        .send({ message: "receiver_phone must start with +998", code: "INVALID_PHONE" });
    }
    if (normalizedPhone) {
      payload.receiver_phone = normalizedPhone;
    }
    const menuItemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const menuItemIds = menuItemsPayload
      .map((item) => item.menu_item_id)
      .filter((itemId): itemId is string => Boolean(itemId));
    const vendorId = payload.vendor_id ?? "";

    const promoCode = normalizePromoCode(
      typeof payload.promo_code === "string" ? payload.promo_code : null,
    );
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
        const message = promoCodeErrorMessage(
          context.promoCode ?? null,
          quote.itemsSubtotal,
          quote.discountTotal,
        );
        const statusCode = message === "promo_code not found" ? 404 : 400;
        return reply.status(statusCode).send({ message });
      }
      const snapshot = buildOrderSnapshot(quote);

      const deliveryCode = generateNumericCode();
      const deliveryHash = hashCode(deliveryCode);

      const order = await (prisma as PrismaClient).$transaction(async (tx) => {
        if (clientId) {
          await tx.client.upsert({
            where: { id: clientId },
            update: {},
            create: { id: clientId },
          });
        }
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

        const created = await tx.order.create({
          data: {
            vendorId: quoteRequest.vendorId,
            clientId: clientId ?? null,
            fulfillmentType: quoteRequest.fulfillmentType,
            status: OrderStatus.NEW,
            deliveryLat: quoteRequest.deliveryLocation?.lat ?? null,
            deliveryLng: quoteRequest.deliveryLocation?.lng ?? null,
            deliveryComment: quoteRequest.deliveryComment ?? null,
            vendorComment: payload.vendor_comment ?? null,
            utensilsCount: payload.utensils_count ?? payload.napkins_count ?? 0,
            napkinsCount: 0,
            receiverPhone: payload.receiver_phone ?? null,
            paymentMethod: payload.payment_method ?? null,
            changeForAmount: payload.change_for_amount ?? null,
            addressText: payload.address_text ?? null,
            addressStreet: payload.address_street ?? null,
            addressHouse: payload.address_house ?? null,
            addressEntrance: payload.address_entrance ?? null,
            addressApartment: payload.address_apartment ?? null,
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
        if (context.promoCode && quote.promoCodeApplied && clientId) {
          await tx.promoCodeRedemption.create({
            data: {
              promoCodeId: context.promoCode.id,
              clientId,
              orderId: created.id,
            },
          });
        }
        return created;
      });

        const response = {
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
        };

        return reply.status(201).send(response);
    } catch (error) {
      if (isPromoRedemptionConflict(error)) {
        return reply
          .status(400)
          .send({ message: "promo_code already used", code: "PROMO_ALREADY_USED" });
      }
      if (error instanceof QuoteNotFoundError) {
        return reply.status(404).send({ message: error.message });
      }
      if (error instanceof QuoteValidationError) {
        return reply
          .status(400)
          .send({ message: error.message, ...(error.code ? { code: error.code } : {}) });
      }
      request.log.error({ err: error }, "Unhandled error during order creation");
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/client/orders", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const query = request.query as { status?: string; limit?: string; cursor?: string };
    const statuses = query.status
      ? query.status.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const take = Math.min(Number(query.limit) || 20, 50);
    const cursorDate = query.cursor ? new Date(query.cursor) : null;

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        clientId: role === "ADMIN" ? undefined : clientId,
        status: statuses.length > 0 ? { in: statuses as OrderStatus[] } : undefined,
        createdAt: cursorDate ? { lt: cursorDate } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { vendor: true },
    });

    const nextCursor = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        vendor_id: order.vendorId,
        vendor_name: order.vendor.name ?? `Vendor ${order.vendorId.slice(0, 6)}`,
        status: order.status,
        total: order.total,
        fulfillment_type: order.fulfillmentType,
        created_at: order.createdAt,
      })),
      next_cursor: nextCursor,
    });
  });

  app.get("/client/orders/:orderId", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        promoCode: true,
        vendor: true,
        rating: true,
      },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (role === "CLIENT" && order.clientId && order.clientId !== clientId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courier =
      order.courierId && prisma
        ? await (prisma as PrismaClient).courier.findUnique({
            where: { id: order.courierId },
          })
        : null;

    return reply.send({
      order_id: order.id,
      status: order.status,
      vendor_id: order.vendorId,
      vendor_name: order.vendor.name ?? `Vendor ${order.vendorId.slice(0, 6)}`,
      vendor_geo: { lat: order.vendor.geoLat, lng: order.vendor.geoLng },
      courier_id: order.courierId,
      courier_rating_avg: courier?.ratingAvg ?? null,
      courier_rating_count: courier?.ratingCount ?? null,
      fulfillment_type: order.fulfillmentType,
      delivery_location:
        order.deliveryLat !== null && order.deliveryLng !== null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
      delivery_comment: order.deliveryComment,
      vendor_comment: order.vendorComment,
      utensils_count: order.utensilsCount,
      receiver_phone: order.receiverPhone,
      payment_method: order.paymentMethod,
      change_for_amount: order.changeForAmount,
      address_text: order.addressText,
      address_street: order.addressStreet,
      address_house: order.addressHouse,
      address_entrance: order.addressEntrance,
      address_apartment: order.addressApartment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        title: item.menuItem?.title ?? null,
        weight_value: item.menuItem?.weightValue ?? null,
        weight_unit: item.menuItem?.weightUnit ?? null,
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
      rating: order.rating
        ? {
            vendor_stars: order.rating.vendorStars,
            vendor_comment: order.rating.vendorComment,
            courier_stars: order.rating.courierStars,
            courier_comment: order.rating.courierComment,
          }
        : null,
    });
  });

  app.get("/client/orders/:orderId/tracking", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

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

  app.get("/client/orders/:orderId/rating", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: { rating: true },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }
    if (role === "CLIENT" && order.clientId && order.clientId !== clientId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    if (!order.rating) {
      return reply.send({ rating: null });
    }

    return reply.send({
      rating: {
        vendor_stars: order.rating.vendorStars,
        vendor_comment: order.rating.vendorComment,
        courier_stars: order.rating.courierStars,
        courier_comment: order.rating.courierComment,
        created_at: order.rating.createdAt,
      },
    });
  });

  app.post("/client/orders/:orderId/rating", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as {
      vendor_stars?: number;
      vendor_comment?: string | null;
      courier_stars?: number | null;
      courier_comment?: string | null;
    };

    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: { rating: true },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }
    if (role === "CLIENT" && order.clientId && order.clientId !== clientId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    try {
      assertRateableStatus(order.status);
      validateStars(payload.vendor_stars);
      if (payload.courier_stars !== undefined && payload.courier_stars !== null) {
        validateStars(payload.courier_stars);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      return reply.status(400).send({ message: (error as Error).message, code });
    }

    if (order.rating) {
      return reply.send({
        rating: {
          vendor_stars: order.rating.vendorStars,
          vendor_comment: order.rating.vendorComment,
          courier_stars: order.rating.courierStars,
          courier_comment: order.rating.courierComment,
          created_at: order.rating.createdAt,
        },
      });
    }

    const result = await (prisma as PrismaClient).$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: order.vendorId } });
      if (!vendor) {
        throw new Error("vendor not found");
      }
      const vendorAgg = applyRatingAggregate(
        vendor.ratingAvg ?? 0,
        vendor.ratingCount ?? 0,
        payload.vendor_stars ?? 0,
      );

      const rating = await tx.rating.create({
        data: {
          orderId: order.id,
          vendorId: order.vendorId,
          courierId: order.courierId ?? null,
          vendorStars: payload.vendor_stars ?? 0,
          vendorComment: payload.vendor_comment ?? null,
          courierStars: payload.courier_stars ?? null,
          courierComment: payload.courier_comment ?? null,
        },
      });

      await tx.vendor.update({
        where: { id: order.vendorId },
        data: {
          ratingAvg: vendorAgg.ratingAvg,
          ratingCount: vendorAgg.ratingCount,
        },
      });

      if (order.courierId && payload.courier_stars) {
        const courier = await tx.courier.upsert({
          where: { id: order.courierId },
          update: {},
          create: { id: order.courierId },
        });
        const courierAgg = applyRatingAggregate(
          courier.ratingAvg ?? 0,
          courier.ratingCount ?? 0,
          payload.courier_stars,
        );
        await tx.courier.update({
          where: { id: order.courierId },
          data: {
            ratingAvg: courierAgg.ratingAvg,
            ratingCount: courierAgg.ratingCount,
          },
        });
      }

      return rating;
    });

    return reply.send({
      rating: {
        vendor_stars: result.vendorStars,
        vendor_comment: result.vendorComment,
        courier_stars: result.courierStars,
        courier_comment: result.courierComment,
        created_at: result.createdAt,
      },
    });
  });

  app.get("/client/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const client = await (prisma as PrismaClient).client.upsert({
      where: { id: clientId ?? "" },
      update: {},
      create: { id: clientId ?? "" },
    });

    return reply.send({
      client_id: client.id,
      full_name: client.fullName,
      phone: client.phone,
      telegram_username: client.telegramUsername,
      about: client.about,
    });
  });

  app.patch("/client/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as {
      full_name?: string | null;
      phone?: string | null;
      telegram_username?: string | null;
      about?: string | null;
    };

    const client = await (prisma as PrismaClient).client.upsert({
      where: { id: clientId ?? "" },
      update: {
        fullName: payload.full_name ?? undefined,
        phone: payload.phone ?? undefined,
        telegramUsername: payload.telegram_username ?? undefined,
        about: payload.about ?? undefined,
      },
      create: {
        id: clientId ?? "",
        fullName: payload.full_name ?? null,
        phone: payload.phone ?? null,
        telegramUsername: payload.telegram_username ?? null,
        about: payload.about ?? null,
      },
    });

    return reply.send({
      client_id: client.id,
      full_name: client.fullName,
      phone: client.phone,
      telegram_username: client.telegramUsername,
      about: client.about,
    });
  });

  app.get("/client/profile/addresses", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const addresses = await (prisma as PrismaClient).address.findMany({
      where: { clientId: clientId ?? "" },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      addresses: addresses.map((entry) => ({
        id: entry.id,
        type: entry.type,
        address_text: entry.addressText,
        lat: entry.lat,
        lng: entry.lng,
        entrance: entry.entrance,
        apartment: entry.apartment,
        created_at: entry.createdAt,
      })),
    });
  });

  app.post("/client/profile/addresses", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as {
      type?: "HOME" | "WORK" | "OTHER";
      address_text?: string;
      lat?: number;
      lng?: number;
      entrance?: string | null;
      apartment?: string | null;
    };

    if (!payload.type || !payload.address_text) {
      return reply.status(400).send({ message: "type and address_text are required" });
    }
    if (typeof payload.lat !== "number" || typeof payload.lng !== "number") {
      return reply.status(400).send({ message: "lat and lng are required" });
    }

    const entry = await (prisma as PrismaClient).address.create({
      data: {
        clientId: clientId ?? "",
        type: payload.type,
        addressText: payload.address_text,
        lat: payload.lat,
        lng: payload.lng,
        entrance: payload.entrance ?? null,
        apartment: payload.apartment ?? null,
      },
    });

    return reply.status(201).send({
      id: entry.id,
      type: entry.type,
      address_text: entry.addressText,
      lat: entry.lat,
      lng: entry.lng,
      entrance: entry.entrance,
      apartment: entry.apartment,
      created_at: entry.createdAt,
    });
  });

  app.patch("/client/profile/addresses/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const id = (request.params as { id: string }).id;
    const payload = request.body as {
      type?: "HOME" | "WORK" | "OTHER";
      address_text?: string;
      lat?: number;
      lng?: number;
      entrance?: string | null;
      apartment?: string | null;
    };

    const existing = await (prisma as PrismaClient).address.findUnique({ where: { id } });
    if (!existing || existing.clientId !== clientId) {
      return reply.status(404).send({ message: "address not found" });
    }

    const updated = await (prisma as PrismaClient).address.update({
      where: { id },
      data: {
        type: payload.type,
        addressText: payload.address_text,
        lat: payload.lat,
        lng: payload.lng,
        entrance: payload.entrance === undefined ? undefined : payload.entrance,
        apartment: payload.apartment === undefined ? undefined : payload.apartment,
      },
    });

    return reply.send({
      id: updated.id,
      type: updated.type,
      address_text: updated.addressText,
      lat: updated.lat,
      lng: updated.lng,
      entrance: updated.entrance,
      apartment: updated.apartment,
      created_at: updated.createdAt,
    });
  });

  app.delete("/client/profile/addresses/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const id = (request.params as { id: string }).id;
    const existing = await (prisma as PrismaClient).address.findUnique({ where: { id } });
    if (!existing || existing.clientId !== clientId) {
      return reply.status(404).send({ message: "address not found" });
    }

    await (prisma as PrismaClient).address.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  app.post("/courier/orders/:orderId/accept", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

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

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        fulfillmentType: FulfillmentType.DELIVERY,
        status: OrderStatus.READY,
        courierId: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { vendor: true },
    });

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        vendor_id: order.vendorId,
        vendor_name: order.vendor.name,
        vendor_address: order.vendor.addressText,
        vendor_geo: { lat: order.vendor.geoLat, lng: order.vendor.geoLng },
        delivery_location:
          order.deliveryLat !== null && order.deliveryLng !== null
            ? { lat: order.deliveryLat, lng: order.deliveryLng }
            : null,
        status: order.status,
        items_subtotal: order.itemsSubtotal,
        total: order.total,
        courier_fee: order.deliveryFee,
      })),
    });
  });

  app.get("/courier/orders/:orderId", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: { items: true, vendor: true },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (role === "COURIER") {
      if (!order.courierId || order.courierId !== courierId) {
        return reply.status(403).send({ message: "Forbidden" });
      }
    }

    return reply.send({
      order_id: order.id,
      status: order.status,
      vendor_id: order.vendorId,
      vendor_name: order.vendor.name,
      vendor_address: order.vendor.addressText,
      vendor_geo: { lat: order.vendor.geoLat, lng: order.vendor.geoLng },
      fulfillment_type: order.fulfillmentType,
      delivery_location:
        order.deliveryLat !== null && order.deliveryLng !== null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
      delivery_comment: order.deliveryComment,
      utensils_count: order.utensilsCount,
      receiver_phone: order.receiverPhone,
      payment_method: order.paymentMethod,
      change_for_amount: order.changeForAmount,
      address_text: order.addressText,
      address_street: order.addressStreet,
      address_house: order.addressHouse,
      address_entrance: order.addressEntrance,
      address_apartment: order.addressApartment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        discount_amount: item.discountAmount,
        is_gift: item.isGift,
      })),
      courier_fee: order.deliveryFee,
      total: order.total,
    });
  });

  app.get("/courier/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const [courier, ratings, activeOrdersCount, deliveredCount] = await Promise.all([
      (prisma as PrismaClient).courier.upsert({
        where: { id: courierId ?? "" },
        update: {},
        create: { id: courierId ?? "" },
      }),
      (prisma as PrismaClient).rating.findMany({
        where: { courierId: courierId ?? "" },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      (prisma as PrismaClient).order.count({
        where: {
          courierId: courierId ?? "",
          status: { in: [OrderStatus.COURIER_ACCEPTED, OrderStatus.PICKED_UP] },
        },
      }),
      (prisma as PrismaClient).order.count({
        where: { courierId: courierId ?? "", status: OrderStatus.DELIVERED },
      }),
    ]);

    return reply.send({
      courier_id: courier.id,
      full_name: courier.fullName ?? null,
      phone: courier.phone ?? null,
      telegram_username: courier.telegramUsername ?? null,
      photo_url: courier.photoUrl ?? null,
      delivery_method: courier.deliveryMethod ?? null,
      is_available: courier.isAvailable,
      max_active_orders: courier.maxActiveOrders,
      active_orders_count: activeOrdersCount,
      remaining_slots: courier.isAvailable
        ? Math.max(courier.maxActiveOrders - activeOrdersCount, 0)
        : 0,
      delivered_count: deliveredCount,
      rating_avg: courier.ratingAvg,
      rating_count: courier.ratingCount,
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
      })),
    });
  });

  app.patch("/courier/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as {
      full_name?: string | null;
      phone?: string | null;
      telegram_username?: string | null;
      photo_url?: string | null;
      delivery_method?: DeliveryMethod | null;
      is_available?: boolean;
      max_active_orders?: number;
    };

    if (
      payload.delivery_method &&
      !Object.values(DeliveryMethod).includes(payload.delivery_method)
    ) {
      return reply.status(400).send({ message: "invalid delivery_method" });
    }
    if (payload.max_active_orders !== undefined && payload.max_active_orders < 0) {
      return reply.status(400).send({ message: "max_active_orders must be >= 0" });
    }

    const courier = await (prisma as PrismaClient).courier.upsert({
      where: { id: courierId ?? "" },
      update: {
        fullName: payload.full_name === undefined ? undefined : payload.full_name,
        phone: payload.phone === undefined ? undefined : payload.phone,
        telegramUsername:
          payload.telegram_username === undefined ? undefined : payload.telegram_username,
        photoUrl: payload.photo_url === undefined ? undefined : payload.photo_url,
        deliveryMethod:
          payload.delivery_method === undefined ? undefined : payload.delivery_method,
        isAvailable: payload.is_available,
        maxActiveOrders:
          payload.max_active_orders === undefined ? undefined : payload.max_active_orders,
      },
      create: {
        id: courierId ?? "",
        fullName: payload.full_name ?? null,
        phone: payload.phone ?? null,
        telegramUsername: payload.telegram_username ?? null,
        photoUrl: payload.photo_url ?? null,
        deliveryMethod: payload.delivery_method ?? null,
        isAvailable: payload.is_available ?? true,
        maxActiveOrders: payload.max_active_orders ?? 1,
      },
    });

    return reply.send({
      courier_id: courier.id,
      full_name: courier.fullName ?? null,
      phone: courier.phone ?? null,
      telegram_username: courier.telegramUsername ?? null,
      photo_url: courier.photoUrl ?? null,
      delivery_method: courier.deliveryMethod ?? null,
      is_available: courier.isAvailable,
      max_active_orders: courier.maxActiveOrders,
      rating_avg: courier.ratingAvg,
      rating_count: courier.ratingCount,
    });
  });

  app.get("/courier/ratings", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const ratings = await (prisma as PrismaClient).rating.findMany({
      where: { courierId: courierId ?? "" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return reply.send({
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
      })),
    });
  });

  app.get("/courier/orders/history", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const query = request.query as {
      from?: string;
      to?: string;
      page?: string;
      limit?: string;
    };
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        courierId: role === "ADMIN" ? undefined : courierId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
        createdAt:
          fromDate || toDate
            ? {
                gte: fromDate ?? undefined,
                lte: toDate ?? undefined,
              }
            : undefined,
      },
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return reply.send({
      orders: orders.map((order) =>
        mapCourierHistoryOrder({
          id: order.id,
          vendorId: order.vendorId,
          vendorName: order.vendor.name,
          status: order.status,
          total: order.total,
          deliveryFee: order.deliveryFee,
          createdAt: order.createdAt,
          addressText: order.addressText,
          receiverPhone: order.receiverPhone,
        }),
      ),
      page,
      limit,
    });
  });

  app.get("/courier/balance", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const query = request.query as {
      range?: "today" | "week" | "month" | "custom";
      from?: string;
      to?: string;
    };
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (query.range === "today") {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
      toDate = now;
    } else if (query.range === "week") {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
      toDate = now;
    } else if (query.range === "month") {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 1);
      toDate = now;
    } else if (query.range === "custom") {
      fromDate = query.from ? new Date(query.from) : null;
      toDate = query.to ? new Date(query.to) : null;
    }

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        courierId: role === "ADMIN" ? undefined : courierId,
        status: OrderStatus.DELIVERED,
        createdAt:
          fromDate || toDate
            ? {
                gte: fromDate ?? undefined,
                lte: toDate ?? undefined,
              }
            : undefined,
      },
      select: { deliveryFee: true },
    });

    const summary = computeCourierBalance(orders);

    return reply.send({
      range: query.range ?? "all",
      from: fromDate,
      to: toDate,
      completed_count: summary.count,
      gross_earnings: summary.gross,
      average_per_order: summary.avg,
    });
  });

  app.post("/courier/orders/:orderId/pickup", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "COURIER" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { pickup_code?: string };
    const normalizedPickup = payload.pickup_code
      ? normalizeNumericCode(payload.pickup_code)
      : null;
    if (!normalizedPickup) {
      return reply.status(400).send({ message: "pickup_code is required" });
    }

    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

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

    if (!order.pickupCodeHash || !order.pickupCodeSalt) {
      return reply.status(409).send({ message: "pickup_code not generated yet" });
    }

    const isValid = verifyCode(normalizedPickup, order.pickupCodeHash, order.pickupCodeSalt);
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

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { delivery_code?: string };
    const normalizedDelivery = payload.delivery_code
      ? normalizeNumericCode(payload.delivery_code)
      : null;
    if (!normalizedDelivery) {
      return reply.status(400).send({ message: "delivery_code is required" });
    }

    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      return reply.status(400).send({ message: "order is not a delivery order" });
    }

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

    if (!order.deliveryCodeHash || !order.deliveryCodeSalt) {
      return reply.status(409).send({ message: "delivery_code not generated yet" });
    }

    const isValid = verifyCode(
      normalizedDelivery,
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

    const courierId = resolveCourierId(request, role);
    if (!courierId && role !== "ADMIN") {
      return reply.status(401).send({ message: "telegram initData is required" });
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
        status: {
          in: [
            OrderStatus.NEW,
            OrderStatus.ACCEPTED,
            OrderStatus.COOKING,
            OrderStatus.READY,
            OrderStatus.COURIER_ACCEPTED,
            OrderStatus.PICKED_UP,
            OrderStatus.READY_FOR_PICKUP,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return reply.send({ orders: orders.map(mapOrderSummary) });
  });

  app.get("/vendor/orders", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const query = request.query as {
      status?: "active" | "history";
      from?: string;
      to?: string;
      page?: string;
      limit?: string;
    };
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    const statusFilter =
      query.status === "history"
        ? {
            in: [
              OrderStatus.DELIVERED,
              OrderStatus.CANCELLED,
              OrderStatus.CANCELLED_BY_VENDOR,
              OrderStatus.PICKED_UP_BY_CUSTOMER,
            ],
          }
        : query.status === "active"
          ? {
              in: [
                OrderStatus.NEW,
                OrderStatus.ACCEPTED,
                OrderStatus.COOKING,
                OrderStatus.READY,
                OrderStatus.COURIER_ACCEPTED,
                OrderStatus.PICKED_UP,
                OrderStatus.READY_FOR_PICKUP,
              ],
            }
          : undefined;

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId: role === "ADMIN" ? undefined : vendorId,
        status: statusFilter,
        createdAt:
          fromDate || toDate
            ? {
                gte: fromDate ?? undefined,
                lte: toDate ?? undefined,
              }
            : undefined,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { items: true },
    });

    return reply.send({
      orders: orders.map(mapOrderSummary),
      page,
      limit,
    });
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

  app.get("/vendor/orders/:orderId", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        events: true,
        tracking: true,
        rating: true,
        promoCode: true,
        vendor: true,
      },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }
    if (role === "VENDOR" && order.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    return reply.send({
      order_id: order.id,
      status: order.status,
      vendor_id: order.vendorId,
      vendor_name: order.vendor?.name ?? null,
      client_id: order.clientId,
      courier_id: order.courierId,
      fulfillment_type: order.fulfillmentType,
      delivery_location:
        order.deliveryLat !== null && order.deliveryLng !== null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
      delivery_comment: order.deliveryComment,
      vendor_comment: order.vendorComment,
      utensils_count: order.utensilsCount,
      receiver_phone: order.receiverPhone,
      payment_method: order.paymentMethod,
      change_for_amount: order.changeForAmount,
      address_text: order.addressText,
      address_street: order.addressStreet,
      address_house: order.addressHouse,
      address_entrance: order.addressEntrance,
      address_apartment: order.addressApartment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        title: item.menuItem?.title ?? null,
        weight_value: item.menuItem?.weightValue ?? null,
        weight_unit: item.menuItem?.weightUnit ?? null,
        quantity: item.quantity,
        price: item.price,
        discount_amount: item.discountAmount,
        is_gift: item.isGift,
      })),
      items_subtotal: order.itemsSubtotal,
      discount_total: order.discountTotal,
      promo_code: order.promoCode?.code ?? null,
      promo_code_type: order.promoCodeType ?? null,
      promo_code_value: order.promoCodeValue ?? null,
      promo_code_discount: order.promoCodeDiscount ?? 0,
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
      rating: order.rating
        ? {
            vendor_stars: order.rating.vendorStars,
            vendor_comment: order.rating.vendorComment,
            courier_stars: order.rating.courierStars,
            courier_comment: order.rating.courierComment,
            created_at: order.rating.createdAt,
          }
        : null,
    });
  });

  app.get("/vendor/dashboard", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const range = (request.query as { range?: string }).range ?? "7d";
    const days = range.endsWith("d") ? Number(range.replace("d", "")) : 7;
    const start = new Date();
    start.setDate(start.getDate() - (Number.isFinite(days) ? days : 7));

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId: role === "ADMIN" ? undefined : vendorId,
        status: OrderStatus.DELIVERED,
        createdAt: { gte: start },
      },
      orderBy: { createdAt: "desc" },
    });
    const vendor =
      role === "ADMIN"
        ? null
        : await (prisma as PrismaClient).vendor.findUnique({ where: { id: vendorId } });

    return reply.send(
      computeVendorDashboard(orders, vendor, Number.isFinite(days) ? days : 7),
    );
  });

  app.get("/vendor/reviews", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const reviews = await (prisma as PrismaClient).rating.findMany({
      where: { vendorId: role === "ADMIN" ? undefined : vendorId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return reply.send({
      reviews: reviews.map((review) => ({
        order_id: review.orderId,
        vendor_stars: review.vendorStars,
        vendor_comment: review.vendorComment,
        courier_stars: review.courierStars,
        courier_comment: review.courierComment,
        created_at: review.createdAt,
      })),
    });
  });

  app.get("/vendor/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const vendor = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: vendorId ?? "" },
    });
    if (!vendor) {
      return reply.status(404).send({ message: "vendor not found" });
    }

    return reply.send({
      vendor_id: vendor.id,
      name: vendor.name,
      owner_full_name: vendor.ownerFullName,
      phone1: vendor.phone1 ?? vendor.phone,
      phone2: vendor.phone2,
      phone3: vendor.phone3,
      email: vendor.email,
      inn: vendor.inn,
      address_text: vendor.addressText,
      opening_hours: vendor.openingHours,
      supports_pickup: vendor.supportsPickup,
      payment_methods: {
        cash: true,
        card: true,
      },
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
    });
  });

  app.patch("/vendor/profile", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const payload = request.body as {
      name?: string;
      owner_full_name?: string | null;
      phone?: string | null;
      phone1?: string | null;
      phone2?: string | null;
      phone3?: string | null;
      email?: string | null;
      inn?: string | null;
      address_text?: string | null;
      opening_hours?: string | null;
      supports_pickup?: boolean;
      geo?: { lat: number; lng: number };
    };

    const resolvedPhone1 =
      payload.phone1 !== undefined
        ? payload.phone1
        : payload.phone !== undefined
          ? payload.phone
          : undefined;

    const vendor = await (prisma as PrismaClient).vendor.update({
      where: { id: vendorId ?? "" },
      data: {
        name: payload.name,
        ownerFullName:
          payload.owner_full_name === undefined ? undefined : payload.owner_full_name,
        phone1: resolvedPhone1,
        phone2: payload.phone2 === undefined ? undefined : payload.phone2,
        phone3: payload.phone3 === undefined ? undefined : payload.phone3,
        email: payload.email === undefined ? undefined : payload.email,
        inn: payload.inn === undefined ? undefined : payload.inn,
        phone: resolvedPhone1 === undefined ? undefined : resolvedPhone1,
        addressText: payload.address_text === undefined ? undefined : payload.address_text,
        openingHours: payload.opening_hours === undefined ? undefined : payload.opening_hours,
        supportsPickup: payload.supports_pickup,
        geoLat: payload.geo?.lat,
        geoLng: payload.geo?.lng,
      },
    });

    return reply.send({
      vendor_id: vendor.id,
      name: vendor.name,
      owner_full_name: vendor.ownerFullName,
      phone1: vendor.phone1 ?? vendor.phone,
      phone2: vendor.phone2,
      phone3: vendor.phone3,
      email: vendor.email,
      inn: vendor.inn,
      address_text: vendor.addressText,
      opening_hours: vendor.openingHours,
      supports_pickup: vendor.supportsPickup,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
    });
  });

  app.get("/vendor/promotions", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const promotions = await (prisma as PrismaClient).promotion.findMany({
      where: { vendorId },
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
        priority: promo.priority,
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

  app.post("/vendor/promotions", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (!vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const payload = request.body as PromotionPayload;
    const promoType = payload.promo_type;
    if (!promoType) {
      return reply.status(400).send({ message: "promo_type is required" });
    }

    const valueNumeric = resolvePromotionValue(promoType, payload.value_numeric);
    if (valueNumeric === null) {
      return reply.status(400).send({ message: "value_numeric is required" });
    }

    let relations = {};
    try {
      relations = buildPromotionRelations(promoType, payload);
    } catch (error) {
      return reply.status(400).send({ message: (error as Error).message });
    }

    const promo = await (prisma as PrismaClient).promotion.create({
      data: {
        vendorId,
        promoType,
        valueNumeric,
        priority: payload.priority ?? 0,
        isActive: payload.is_active ?? true,
        startsAt: payload.starts_at ? new Date(payload.starts_at) : null,
        endsAt: payload.ends_at ? new Date(payload.ends_at) : null,
        ...relations,
      },
      include: {
        promotionItems: true,
        comboItems: true,
        buyXGetY: true,
        gift: true,
      },
    });

    return reply.status(201).send({
      promotion_id: promo.id,
      vendor_id: promo.vendorId,
      promo_type: promo.promoType,
      value_numeric: promo.valueNumeric,
      priority: promo.priority,
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
    });
  });

  app.patch("/vendor/promotions/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const payload = request.body as PromotionPayload;

    const existing = await (prisma as PrismaClient).promotion.findUnique({
      where: { id },
      include: {
        promotionItems: true,
        comboItems: true,
        buyXGetY: true,
        gift: true,
      },
    });
    if (!existing) {
      return reply.status(404).send({ message: "promotion not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const nextType = payload.promo_type ?? (existing.promoType as PromotionType);
    let nextValue = existing.valueNumeric;
    if (payload.value_numeric !== undefined) {
      const resolved = resolvePromotionValue(nextType, payload.value_numeric);
      if (resolved === null) {
        return reply.status(400).send({ message: "value_numeric is required" });
      }
      nextValue = resolved;
    } else if (payload.promo_type && (nextType === PromotionType.BUY_X_GET_Y || nextType === PromotionType.GIFT)) {
      nextValue = 0;
    }

    const shouldReplaceRelations =
      payload.promo_type !== undefined ||
      payload.items !== undefined ||
      payload.combo_items !== undefined ||
      payload.buy_x_get_y !== undefined ||
      payload.gift !== undefined;

    let relations = {};
    if (shouldReplaceRelations) {
      try {
        relations = buildPromotionRelations(nextType, payload);
      } catch (error) {
        return reply.status(400).send({ message: (error as Error).message });
      }
    }

    const updated = await (prisma as PrismaClient).$transaction(async (tx) => {
      if (shouldReplaceRelations) {
        await tx.promotionItem.deleteMany({ where: { promotionId: id } });
        await tx.promotionComboItem.deleteMany({ where: { promotionId: id } });
        await tx.promotionBuyXGetY.deleteMany({ where: { promotionId: id } });
        await tx.promotionGift.deleteMany({ where: { promotionId: id } });
      }

      return tx.promotion.update({
        where: { id },
        data: {
          promoType: payload.promo_type ?? undefined,
          valueNumeric: nextValue,
          priority: payload.priority ?? undefined,
          isActive: payload.is_active,
          startsAt:
            payload.starts_at === undefined
              ? undefined
              : payload.starts_at
                ? new Date(payload.starts_at)
                : null,
          endsAt:
            payload.ends_at === undefined
              ? undefined
              : payload.ends_at
                ? new Date(payload.ends_at)
                : null,
          ...(shouldReplaceRelations ? relations : {}),
        },
        include: {
          promotionItems: true,
          comboItems: true,
          buyXGetY: true,
          gift: true,
        },
      });
    });

    return reply.send({
      promotion_id: updated.id,
      vendor_id: updated.vendorId,
      promo_type: updated.promoType,
      value_numeric: updated.valueNumeric,
      priority: updated.priority,
      is_active: updated.isActive,
      starts_at: updated.startsAt,
      ends_at: updated.endsAt,
      items: updated.promotionItems.map((item) => item.menuItemId),
      combo_items: updated.comboItems.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
      })),
      buy_x_get_y: updated.buyXGetY
        ? {
            buy_item_id: updated.buyXGetY.buyItemId,
            buy_quantity: updated.buyXGetY.buyQuantity,
            get_item_id: updated.buyXGetY.getItemId,
            get_quantity: updated.buyXGetY.getQuantity,
            discount_percent: updated.buyXGetY.discountPercent,
          }
        : null,
      gift: updated.gift
        ? {
            gift_item_id: updated.gift.giftItemId,
            gift_quantity: updated.gift.giftQuantity,
            min_order_amount: updated.gift.minOrderAmount,
          }
        : null,
    });
  });

  app.delete("/vendor/promotions/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const existing = await (prisma as PrismaClient).promotion.findUnique({
      where: { id },
    });
    if (!existing) {
      return reply.status(404).send({ message: "promotion not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    await (prisma as PrismaClient).promotion.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  app.get("/vendor/menu", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const items = await (prisma as PrismaClient).menuItem.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ items: items.map((item) => mapMenuItem(item)) });
  });

  app.get("/vendor/menu-items", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const items = await (prisma as PrismaClient).menuItem.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ items: items.map((item) => mapMenuItem(item)) });
  });

  app.post("/vendor/menu-items", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (!vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const payload = request.body as {
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    if (!payload.title) {
      return reply.status(400).send({ message: "title is required" });
    }
    if (typeof payload.price !== "number") {
      return reply.status(400).send({ message: "price is required" });
    }

    const item = await (prisma as PrismaClient).menuItem.create({
      data: {
        vendorId,
        title: payload.title,
        description: payload.description ?? null,
        weightValue: payload.weight_value ?? null,
        weightUnit: payload.weight_unit ?? null,
        price: payload.price,
        isAvailable: payload.is_available ?? true,
        category: payload.category ?? null,
        imageUrl: payload.image_url ?? null,
      },
    });

    return reply.status(201).send(mapMenuItem(item));
  });

  app.patch("/vendor/menu-items/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const payload = request.body as {
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    const existing = await (prisma as PrismaClient).menuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "menu item not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const item = await (prisma as PrismaClient).menuItem.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description === undefined ? undefined : payload.description,
        weightValue: payload.weight_value === undefined ? undefined : payload.weight_value,
        weightUnit: payload.weight_unit === undefined ? undefined : payload.weight_unit,
        price: payload.price,
        isAvailable: payload.is_available,
        category: payload.category === undefined ? undefined : payload.category,
        imageUrl: payload.image_url === undefined ? undefined : payload.image_url,
      },
    });

    return reply.send(mapMenuItem(item));
  });

  app.delete("/vendor/menu-items/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const existing = await (prisma as PrismaClient).menuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "menu item not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    await (prisma as PrismaClient).menuItem.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  app.post("/vendor/menu", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (!vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const payload = request.body as {
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    if (!payload.title) {
      return reply.status(400).send({ message: "title is required" });
    }
    if (typeof payload.price !== "number") {
      return reply.status(400).send({ message: "price is required" });
    }

    const vendor = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      return reply.status(400).send({ message: "vendor_id not found" });
    }

    const item = await (prisma as PrismaClient).menuItem.create({
      data: {
        vendorId,
        title: payload.title,
        description: payload.description ?? null,
        weightValue: payload.weight_value ?? null,
        weightUnit: payload.weight_unit ?? null,
        price: payload.price,
        isAvailable: payload.is_available ?? true,
        category: payload.category ?? null,
        imageUrl: payload.image_url ?? null,
      },
    });

    return reply.status(201).send(mapMenuItem(item));
  });

  app.patch("/vendor/menu/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const payload = request.body as {
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    const existing = await (prisma as PrismaClient).menuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "menu item not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const item = await (prisma as PrismaClient).menuItem.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description === undefined ? undefined : payload.description,
        weightValue: payload.weight_value === undefined ? undefined : payload.weight_value,
        weightUnit: payload.weight_unit === undefined ? undefined : payload.weight_unit,
        price: payload.price,
        isAvailable: payload.is_available,
        category: payload.category === undefined ? undefined : payload.category,
        imageUrl: payload.image_url === undefined ? undefined : payload.image_url,
      },
    });

    return reply.send(mapMenuItem(item));
  });

  app.delete("/vendor/menu/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "VENDOR" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const vendorId = readHeader(request, "x-vendor-id");
    if (role === "VENDOR" && !vendorId) {
      return reply.status(400).send({ message: "x-vendor-id is required" });
    }

    const id = (request.params as { id: string }).id;
    const existing = await (prisma as PrismaClient).menuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "menu item not found" });
    }
    if (role === "VENDOR" && existing.vendorId !== vendorId) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    await (prisma as PrismaClient).menuItem.delete({ where: { id } });
    return reply.send({ deleted: true });
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
    let pickupCode: string | null = null;
    if (nextStatus === OrderStatus.READY && order.fulfillmentType === FulfillmentType.DELIVERY) {
      pickupCode = generateNumericCode();
      const pickupHash = hashCode(pickupCode);
      const updated = await (prisma as PrismaClient).order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          pickupCodeHash: pickupHash.hash,
          pickupCodeSalt: pickupHash.salt,
          events: { create: { eventType } },
        },
      });
      return reply.send({
        order_id: updated.id,
        status: updated.status,
        pickup_code: pickupCode,
      });
    }

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        events: { create: { eventType } },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status, pickup_code: null });
  });


  app.get("/admin/vendors", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const now = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const [vendors, activePromotions, weeklyAgg] = await Promise.all([
      (prisma as PrismaClient).vendor.findMany({
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).promotion.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        select: { vendorId: true },
      }),
      (prisma as PrismaClient).order.groupBy({
        by: ["vendorId"],
        where: { status: OrderStatus.DELIVERED, createdAt: { gte: weekStart } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const promoCount = new Map<string, number>();
    for (const promo of activePromotions) {
      promoCount.set(promo.vendorId, (promoCount.get(promo.vendorId) ?? 0) + 1);
    }

    const weeklyStats = new Map<string, { revenue: number; completed_count: number; average_check: number }>();
    for (const agg of weeklyAgg) {
      const revenue = agg._sum.total ?? 0;
      const completed = agg._count._all;
      weeklyStats.set(agg.vendorId, {
        revenue,
        completed_count: completed,
        average_check: completed > 0 ? Math.round(revenue / completed) : 0,
      });
    }

    return reply.send({
      vendors: vendors.map((vendor) => ({
        vendor_id: vendor.id,
        name: vendor.name,
        owner_full_name: vendor.ownerFullName,
        phone1: vendor.phone1 ?? vendor.phone,
        phone2: vendor.phone2,
        phone3: vendor.phone3,
        email: vendor.email,
        phone: vendor.phone,
        inn: vendor.inn,
        category: vendor.category,
        supports_pickup: vendor.supportsPickup,
        address_text: vendor.addressText,
        is_active: vendor.isActive,
        opening_hours: vendor.openingHours,
        payout_details: vendor.payoutDetails,
        geo: { lat: vendor.geoLat, lng: vendor.geoLng },
        rating_avg: vendor.ratingAvg ?? 0,
        rating_count: vendor.ratingCount ?? 0,
        active_promotions_count: promoCount.get(vendor.id) ?? 0,
        weekly_stats: weeklyStats.get(vendor.id) ?? {
          revenue: 0,
          completed_count: 0,
          average_check: 0,
        },
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
      name?: string;
      description?: string | null;
      owner_full_name?: string | null;
      phone?: string;
      phone1?: string;
      phone2?: string | null;
      phone3?: string | null;
      email?: string | null;
      inn?: string;
      category?: string;
      supports_pickup?: boolean;
      address_text?: string;
      is_active?: boolean;
      opening_hours?: string;
      payout_details?: unknown;
      geo?: { lat?: number; lng?: number };
    };

    if (!payload.name) {
      return reply.status(400).send({ message: "name is required" });
    }
    if (!payload.category) {
      return reply.status(400).send({ message: "category is required" });
    }
    const phone1 = payload.phone1 ?? payload.phone ?? null;
    if (!phone1) {
      return reply.status(400).send({ message: "phone1 is required" });
    }
    if (!payload.geo || typeof payload.geo.lat !== "number" || typeof payload.geo.lng !== "number") {
      return reply.status(400).send({ message: "geo.lat and geo.lng are required" });
    }

    const vendor = await (prisma as PrismaClient).vendor.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        ownerFullName: payload.owner_full_name ?? null,
        phone1,
        phone2: payload.phone2 ?? null,
        phone3: payload.phone3 ?? null,
        email: payload.email ?? null,
        phone: phone1,
        inn: payload.inn ?? null,
        category: payload.category as string,
        supportsPickup: payload.supports_pickup ?? false,
        addressText: payload.address_text ?? null,
        isActive: payload.is_active ?? true,
        openingHours: payload.opening_hours ?? null,
        payoutDetails: payload.payout_details ?? undefined,
        geoLat: payload.geo.lat,
        geoLng: payload.geo.lng,
      },
    });

    return reply.status(201).send({
      vendor_id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      owner_full_name: vendor.ownerFullName,
      phone1: vendor.phone1 ?? vendor.phone,
      phone2: vendor.phone2,
      phone3: vendor.phone3,
      email: vendor.email,
      phone: vendor.phone,
      inn: vendor.inn,
      category: vendor.category,
      supports_pickup: vendor.supportsPickup,
      address_text: vendor.addressText,
      is_active: vendor.isActive,
      opening_hours: vendor.openingHours,
      payout_details: vendor.payoutDetails,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
      created_at: vendor.createdAt,
    });
  });

  app.get("/admin/vendors/:vendorId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const vendor = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      return reply.status(404).send({ message: "vendor not found" });
    }

    return reply.send({
      vendor_id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      owner_full_name: vendor.ownerFullName,
      phone1: vendor.phone1 ?? vendor.phone,
      phone2: vendor.phone2,
      phone3: vendor.phone3,
      email: vendor.email,
      phone: vendor.phone,
      inn: vendor.inn,
      category: vendor.category,
      supports_pickup: vendor.supportsPickup,
      address_text: vendor.addressText,
      is_active: vendor.isActive,
      opening_hours: vendor.openingHours,
      payout_details: vendor.payoutDetails,
      geo: { lat: vendor.geoLat, lng: vendor.geoLng },
      rating_avg: vendor.ratingAvg ?? 0,
      rating_count: vendor.ratingCount ?? 0,
      created_at: vendor.createdAt,
    });
  });

  app.get("/admin/menu-items", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const query = request.query as { vendor_id?: string };
    if (!query.vendor_id) {
      return reply.status(400).send({ message: "vendor_id is required" });
    }

    const items = await (prisma as PrismaClient).menuItem.findMany({
      where: { vendorId: query.vendor_id },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      items: items.map((item) => mapMenuItem(item)),
    });
  });

  app.post("/admin/menu-items", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const payload = request.body as {
      vendor_id?: string;
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    if (!payload.vendor_id) {
      return reply.status(400).send({ message: "vendor_id is required" });
    }
    if (!payload.title) {
      return reply.status(400).send({ message: "title is required" });
    }
    if (typeof payload.price !== "number") {
      return reply.status(400).send({ message: "price is required" });
    }

    const vendor = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: payload.vendor_id },
    });
    if (!vendor) {
      return reply.status(400).send({ message: "vendor_id not found" });
    }

    const item = await (prisma as PrismaClient).menuItem.create({
      data: {
        vendorId: payload.vendor_id,
        title: payload.title,
        description: payload.description ?? null,
        weightValue: payload.weight_value ?? null,
        weightUnit: payload.weight_unit ?? null,
        price: payload.price,
        isAvailable: payload.is_available ?? true,
        category: payload.category ?? null,
        imageUrl: payload.image_url ?? null,
      },
    });

    return reply.status(201).send(mapMenuItem(item));
  });

  app.patch("/admin/menu-items/:id", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const id = (request.params as { id: string }).id;
    const payload = request.body as {
      title?: string;
      description?: string | null;
      weight_value?: number | null;
      weight_unit?: string | null;
      price?: number;
      is_available?: boolean;
      category?: string | null;
      image_url?: string | null;
    };

    const existing = await (prisma as PrismaClient).menuItem.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "menu item not found" });
    }

    const item = await (prisma as PrismaClient).menuItem.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description === undefined ? undefined : payload.description,
        weightValue: payload.weight_value === undefined ? undefined : payload.weight_value,
        weightUnit: payload.weight_unit === undefined ? undefined : payload.weight_unit,
        price: payload.price,
        isAvailable: payload.is_available,
        category: payload.category === undefined ? undefined : payload.category,
        imageUrl: payload.image_url === undefined ? undefined : payload.image_url,
      },
    });

    return reply.send(mapMenuItem(item));
  });

  app.delete("/admin/menu-items/:id", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const id = (request.params as { id: string }).id;
    await (prisma as PrismaClient).menuItem.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  app.patch("/admin/vendors/:vendorId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const payload = request.body as {
      name?: string;
      description?: string | null;
      owner_full_name?: string | null;
      phone?: string | null;
      phone1?: string | null;
      phone2?: string | null;
      phone3?: string | null;
      email?: string | null;
      inn?: string | null;
      category?: string;
      supports_pickup?: boolean;
      address_text?: string | null;
      is_active?: boolean;
      opening_hours?: string | null;
      payout_details?: unknown | null;
      geo?: { lat?: number; lng?: number };
    };

    if (payload.geo && (typeof payload.geo.lat !== "number" || typeof payload.geo.lng !== "number")) {
      return reply.status(400).send({ message: "geo.lat and geo.lng are required" });
    }

    const existing = await (prisma as PrismaClient).vendor.findUnique({
      where: { id: vendorId },
    });
    if (!existing) {
      return reply.status(404).send({ message: "vendor not found" });
    }

    const resolvedPhone1 =
      payload.phone1 !== undefined
        ? payload.phone1
        : payload.phone !== undefined
          ? payload.phone
          : undefined;

    const vendor = await (prisma as PrismaClient).vendor.update({
      where: { id: vendorId },
      data: {
        name: payload.name,
        description: payload.description === undefined ? undefined : payload.description,
        ownerFullName:
          payload.owner_full_name === undefined ? undefined : payload.owner_full_name,
        phone1: resolvedPhone1,
        phone2: payload.phone2 === undefined ? undefined : payload.phone2,
        phone3: payload.phone3 === undefined ? undefined : payload.phone3,
        email: payload.email === undefined ? undefined : payload.email,
        phone: resolvedPhone1 === undefined ? undefined : resolvedPhone1,
        inn: payload.inn === undefined ? undefined : payload.inn,
        category: payload.category as string | undefined,
        supportsPickup: payload.supports_pickup,
        addressText: payload.address_text === undefined ? undefined : payload.address_text,
        isActive: payload.is_active,
        openingHours: payload.opening_hours === undefined ? undefined : payload.opening_hours,
        payoutDetails: payload.payout_details === undefined ? undefined : payload.payout_details,
        geoLat: payload.geo?.lat === undefined ? undefined : payload.geo.lat,
        geoLng: payload.geo?.lng === undefined ? undefined : payload.geo.lng,
      },
    });

    return reply.send({
      vendor_id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      owner_full_name: vendor.ownerFullName,
      phone1: vendor.phone1 ?? vendor.phone,
      phone2: vendor.phone2,
      phone3: vendor.phone3,
      email: vendor.email,
      phone: vendor.phone,
      inn: vendor.inn,
      category: vendor.category,
      supports_pickup: vendor.supportsPickup,
      address_text: vendor.addressText,
      is_active: vendor.isActive,
      opening_hours: vendor.openingHours,
      payout_details: vendor.payoutDetails,
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
      order_id?: string;
      status?: string;
      vendor_id?: string;
      vendor_name?: string;
      client_id?: string;
      receiver_phone?: string;
      fulfillment_type?: string;
      from?: string;
      to?: string;
    };

    const range = parseRangeQuery({ from: query.from, to: query.to, range: undefined });
    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        id: query.order_id ?? undefined,
        status: query.status ? (query.status as OrderStatus) : undefined,
        vendorId: query.vendor_id ?? undefined,
        clientId: query.client_id ?? undefined,
        receiverPhone: query.receiver_phone ? { contains: query.receiver_phone } : undefined,
        fulfillmentType: query.fulfillment_type ? (query.fulfillment_type as FulfillmentType) : undefined,
        createdAt: query.from || query.to ? { gte: range.from, lte: range.to } : undefined,
        vendor: query.vendor_name
          ? { name: { contains: query.vendor_name, mode: "insensitive" } }
          : undefined,
      },
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        status: order.status,
        vendor_id: order.vendorId,
        vendor_name: order.vendor?.name ?? null,
        client_id: order.clientId ?? null,
        courier_id: order.courierId ?? null,
        fulfillment_type: order.fulfillmentType,
        items_subtotal: order.itemsSubtotal,
        total: order.total,
        delivery_comment: order.deliveryComment,
        vendor_comment: order.vendorComment,
        receiver_phone: order.receiverPhone,
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
      include: { items: { include: { menuItem: true } }, events: true, tracking: true, rating: true },
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
      utensils_count: order.utensilsCount,
      receiver_phone: order.receiverPhone,
      payment_method: order.paymentMethod,
      change_for_amount: order.changeForAmount,
      address_text: order.addressText,
      address_street: order.addressStreet,
      address_house: order.addressHouse,
      address_entrance: order.addressEntrance,
      address_apartment: order.addressApartment,
      items: order.items.map((item) => ({
        menu_item_id: item.menuItemId,
        title: item.menuItem?.title ?? null,
        weight_value: item.menuItem?.weightValue ?? null,
        weight_unit: item.menuItem?.weightUnit ?? null,
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
      rating: order.rating
        ? {
            vendor_stars: order.rating.vendorStars,
            vendor_comment: order.rating.vendorComment,
            courier_stars: order.rating.courierStars,
            courier_comment: order.rating.courierComment,
            created_at: order.rating.createdAt,
          }
        : null,
    });
  });

  app.patch("/admin/orders/:orderId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as {
      status?: string;
      delivery_comment?: string | null;
      vendor_comment?: string | null;
    };

    const order = await (prisma as PrismaClient).order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    const nextStatus = payload.status ? (payload.status as OrderStatus) : null;
    if (nextStatus && !canTransition(order.status, nextStatus, order.fulfillmentType)) {
      return reply
        .status(409)
        .send({ message: `Invalid transition ${order.status} -> ${nextStatus}` });
    }

    let pickupCode: string | null = null;
    const updates: Record<string, unknown> = {
      deliveryComment:
        payload.delivery_comment === undefined ? undefined : payload.delivery_comment,
      vendorComment: payload.vendor_comment === undefined ? undefined : payload.vendor_comment,
    };

    if (nextStatus) {
      updates.status = nextStatus;
      const eventPayload = { from: order.status, to: nextStatus };
      updates.events = { create: { eventType: "admin_status_update", payload: eventPayload } };

      if (
        nextStatus === OrderStatus.READY &&
        order.fulfillmentType === FulfillmentType.DELIVERY
      ) {
        pickupCode = generateNumericCode();
        const pickupHash = hashCode(pickupCode);
        updates.pickupCodeHash = pickupHash.hash;
        updates.pickupCodeSalt = pickupHash.salt;
      }
    }

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: orderId },
      data: updates,
    });

    return reply.send({
      order_id: updated.id,
      status: updated.status,
      pickup_code: pickupCode,
    });
  });

  app.post("/admin/orders/:orderId/cancel", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const orderId = (request.params as { orderId: string }).orderId;
    const payload = request.body as { reason?: string };
    const order = await (prisma as PrismaClient).order.findUnique({ where: { id: orderId } });
    if (!order) {
      return reply.status(404).send({ message: "order not found" });
    }

    try {
      assertTransition(order.status, OrderStatus.CANCELLED, "ADMIN", order.fulfillmentType);
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : "Invalid transition" });
    }

    const updated = await (prisma as PrismaClient).order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        events: {
          create: {
            eventType: "admin_cancelled",
            payload: { reason: payload.reason ?? null },
          },
        },
      },
    });

    return reply.send({ order_id: updated.id, status: updated.status });
  });

  app.get("/admin/clients", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const [clients, ordersAgg, promoAgg, promoUsedAgg] = await Promise.all([
      (prisma as PrismaClient).client.findMany({ orderBy: { createdAt: "desc" } }),
      (prisma as PrismaClient).order.groupBy({
        by: ["clientId"],
        where: { clientId: { not: null } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      (prisma as PrismaClient).clientPromoCode.groupBy({
        by: ["clientId"],
        _count: { _all: true },
      }),
      (prisma as PrismaClient).promoCodeRedemption.groupBy({
        by: ["clientId"],
        _count: { _all: true },
      }),
    ]);

    const clientMap = new Map<
      string,
      {
        client_id: string;
        full_name: string | null;
        phone: string | null;
        telegram_username: string | null;
        created_at: Date;
        orders_count: number;
        total_spent: number;
        saved_promo_codes: number;
        used_promo_codes: number;
      }
    >();

    for (const client of clients) {
      clientMap.set(client.id, {
        client_id: client.id,
        full_name: client.fullName ?? null,
        phone: client.phone ?? null,
        telegram_username: client.telegramUsername ?? null,
        created_at: client.createdAt,
        orders_count: 0,
        total_spent: 0,
        saved_promo_codes: 0,
        used_promo_codes: 0,
      });
    }

    for (const agg of ordersAgg) {
      const clientId = agg.clientId ?? "";
      if (!clientId) continue;
      const entry =
        clientMap.get(clientId) ?? {
          client_id: clientId,
          full_name: null,
          phone: null,
          telegram_username: null,
          created_at: new Date(0),
          orders_count: 0,
          total_spent: 0,
          saved_promo_codes: 0,
          used_promo_codes: 0,
        };
      entry.orders_count = agg._count._all;
      entry.total_spent = agg._sum.total ?? 0;
      clientMap.set(clientId, entry);
    }

    for (const agg of promoAgg) {
      const clientId = agg.clientId;
      const entry =
        clientMap.get(clientId) ?? {
          client_id: clientId,
          full_name: null,
          phone: null,
          telegram_username: null,
          created_at: new Date(0),
          orders_count: 0,
          total_spent: 0,
          saved_promo_codes: 0,
          used_promo_codes: 0,
        };
      entry.saved_promo_codes = agg._count._all;
      clientMap.set(clientId, entry);
    }

    for (const agg of promoUsedAgg) {
      const clientId = agg.clientId;
      const entry =
        clientMap.get(clientId) ?? {
          client_id: clientId,
          full_name: null,
          phone: null,
          telegram_username: null,
          created_at: new Date(0),
          orders_count: 0,
          total_spent: 0,
          saved_promo_codes: 0,
          used_promo_codes: 0,
        };
      entry.used_promo_codes = agg._count._all;
      clientMap.set(clientId, entry);
    }

    return reply.send({ clients: Array.from(clientMap.values()) });
  });

  app.get("/admin/clients/:clientId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const clientId = (request.params as { clientId: string }).clientId;
    const [orders, promoCodes, client, addresses, ratings, redemptions] = await Promise.all([
      (prisma as PrismaClient).order.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      (prisma as PrismaClient).clientPromoCode.findMany({
        where: { clientId },
        include: { promoCode: true },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).client.findUnique({ where: { id: clientId } }),
      (prisma as PrismaClient).address.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).rating.findMany({
        where: { order: { clientId } },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).promoCodeRedemption.findMany({
        where: { clientId },
        select: { promoCodeId: true },
      }),
    ]);
    const redeemed = new Set(redemptions.map((entry) => entry.promoCodeId));

    return reply.send({
      client_id: clientId,
      profile: client
        ? {
            full_name: client.fullName,
            phone: client.phone,
            telegram_username: client.telegramUsername,
            about: client.about,
          }
        : null,
      addresses: addresses.map((entry) => ({
        id: entry.id,
        type: entry.type,
        address_text: entry.addressText,
        lat: entry.lat,
        lng: entry.lng,
        entrance: entry.entrance,
        apartment: entry.apartment,
        created_at: entry.createdAt,
      })),
      orders: orders.map((order) => ({
        order_id: order.id,
        status: order.status,
        vendor_id: order.vendorId,
        fulfillment_type: order.fulfillmentType,
        items_subtotal: order.itemsSubtotal,
        total: order.total,
        created_at: order.createdAt,
      })),
      promo_codes: promoCodes.map((entry) => ({
        id: entry.id,
        code: entry.promoCode.code,
        type: entry.promoCode.type,
        value: entry.promoCode.value,
        is_active: entry.promoCode.isActive,
        status: promoCodeStatus(entry.promoCode, redeemed.has(entry.promoCodeId)),
        used: redeemed.has(entry.promoCodeId),
      })),
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        vendor_id: rating.vendorId,
        courier_id: rating.courierId,
        vendor_stars: rating.vendorStars,
        vendor_comment: rating.vendorComment,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
      })),
    });
  });

  app.get("/admin/clients/:clientId/orders", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const clientId = (request.params as { clientId: string }).clientId;
    const orders = await (prisma as PrismaClient).order.findMany({
      where: { clientId },
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
        created_at: order.createdAt,
      })),
    });
  });

  app.get("/admin/clients/:clientId/addresses", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const clientId = (request.params as { clientId: string }).clientId;
    const addresses = await (prisma as PrismaClient).address.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      addresses: addresses.map((entry) => ({
        id: entry.id,
        type: entry.type,
        address_text: entry.addressText,
        lat: entry.lat,
        lng: entry.lng,
        entrance: entry.entrance,
        apartment: entry.apartment,
        created_at: entry.createdAt,
      })),
    });
  });

  app.get("/admin/clients/:clientId/promo-codes", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const clientId = (request.params as { clientId: string }).clientId;
    const [promoCodes, redemptions] = await Promise.all([
      (prisma as PrismaClient).clientPromoCode.findMany({
        where: { clientId },
        include: { promoCode: true },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).promoCodeRedemption.findMany({
        where: { clientId },
        select: { promoCodeId: true },
      }),
    ]);
    const redeemed = new Set(redemptions.map((entry) => entry.promoCodeId));

    return reply.send({
      promo_codes: promoCodes.map((entry) => ({
        id: entry.id,
        code: entry.promoCode.code,
        type: entry.promoCode.type,
        value: entry.promoCode.value,
        is_active: entry.promoCode.isActive,
        status: promoCodeStatus(entry.promoCode, redeemed.has(entry.promoCodeId)),
        used: redeemed.has(entry.promoCodeId),
      })),
    });
  });

  app.get("/admin/clients/:clientId/ratings", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const clientId = (request.params as { clientId: string }).clientId;
    const ratings = await (prisma as PrismaClient).rating.findMany({
      where: { order: { clientId } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        vendor_id: rating.vendorId,
        courier_id: rating.courierId,
        vendor_stars: rating.vendorStars,
        vendor_comment: rating.vendorComment,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
      })),
    });
  });

  app.get("/admin/couriers", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const [orders, couriers] = await Promise.all([
      (prisma as PrismaClient).order.findMany({
        where: { courierId: { not: null } },
        select: { courierId: true, status: true, deliveryFee: true },
      }),
      (prisma as PrismaClient).courier.findMany(),
    ]);

    const courierMap = new Map<
      string,
      {
        courier_id: string;
        delivered_count: number;
        active_status: string | null;
        rating_avg: number | null;
        rating_count: number | null;
        gross_earnings: number;
        full_name: string | null;
        phone: string | null;
        telegram_username: string | null;
        delivery_method: string | null;
        is_available: boolean | null;
        max_active_orders: number | null;
      }
    >();

    for (const courier of couriers) {
      courierMap.set(courier.id, {
        courier_id: courier.id,
        delivered_count: 0,
        active_status: null,
        rating_avg: courier.ratingAvg,
        rating_count: courier.ratingCount,
        gross_earnings: 0,
        full_name: courier.fullName ?? null,
        phone: courier.phone ?? null,
        telegram_username: courier.telegramUsername ?? null,
        delivery_method: courier.deliveryMethod ?? null,
        is_available: courier.isAvailable ?? null,
        max_active_orders: courier.maxActiveOrders ?? null,
      });
    }

    for (const order of orders) {
      if (!order.courierId) continue;
      const entry =
        courierMap.get(order.courierId) ?? {
        courier_id: order.courierId,
        delivered_count: 0,
        active_status: null,
        rating_avg: null,
        rating_count: null,
        gross_earnings: 0,
        full_name: null,
        phone: null,
        telegram_username: null,
        delivery_method: null,
        is_available: null,
        max_active_orders: null,
      };
      if (order.status === OrderStatus.DELIVERED) {
        entry.delivered_count += 1;
        entry.gross_earnings += order.deliveryFee;
      }
      if (order.status === OrderStatus.COURIER_ACCEPTED || order.status === OrderStatus.PICKED_UP) {
        entry.active_status = order.status;
      }
      courierMap.set(order.courierId, entry);
    }

    return reply.send({ couriers: Array.from(courierMap.values()) });
  });

  app.post("/admin/couriers", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const payload = request.body as {
      courier_id?: string;
      full_name?: string | null;
      phone?: string | null;
      telegram_username?: string | null;
      photo_url?: string | null;
      delivery_method?: DeliveryMethod | string | null;
      is_available?: boolean;
      max_active_orders?: number;
    };

    if (!payload.courier_id) {
      return reply.status(400).send({ message: "courier_id is required" });
    }

    const courier = await (prisma as PrismaClient).courier.create({
      data: {
        id: payload.courier_id,
        fullName: payload.full_name ?? null,
        phone: payload.phone ?? null,
        telegramUsername: payload.telegram_username ?? null,
        photoUrl: payload.photo_url ?? null,
        deliveryMethod: payload.delivery_method as DeliveryMethod | null,
        isAvailable: payload.is_available ?? true,
        maxActiveOrders: payload.max_active_orders ?? 1,
      },
    });

    return reply.status(201).send({
      courier_id: courier.id,
      full_name: courier.fullName,
      phone: courier.phone,
      telegram_username: courier.telegramUsername,
      delivery_method: courier.deliveryMethod,
      is_available: courier.isAvailable,
      max_active_orders: courier.maxActiveOrders,
      delivered_count: 0,
      gross_earnings: 0,
      average_per_order: 0,
      active_status: null,
      rating_avg: courier.ratingAvg ?? 0,
      rating_count: courier.ratingCount ?? 0,
      orders: [],
      ratings: [],
    });
  });

  app.get("/admin/couriers/:courierId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const courierId = (request.params as { courierId: string }).courierId;
    const [orders, courier, ratings] = await Promise.all([
      (prisma as PrismaClient).order.findMany({
      where: { courierId },
      orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).courier.findUnique({ where: { id: courierId } }),
      (prisma as PrismaClient).rating.findMany({
        where: { courierId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const deliveredCount = orders.filter((order) => order.status === OrderStatus.DELIVERED).length;
    const grossEarnings = orders.reduce(
      (sum, order) => (order.status === OrderStatus.DELIVERED ? sum + order.deliveryFee : sum),
      0,
    );
    const active = orders.find(
      (order) =>
        order.status === OrderStatus.COURIER_ACCEPTED || order.status === OrderStatus.PICKED_UP,
    );

    return reply.send({
      courier_id: courierId,
      full_name: courier?.fullName ?? null,
      phone: courier?.phone ?? null,
      telegram_username: courier?.telegramUsername ?? null,
      photo_url: courier?.photoUrl ?? null,
      delivery_method: courier?.deliveryMethod ?? null,
      is_available: courier?.isAvailable ?? null,
      max_active_orders: courier?.maxActiveOrders ?? null,
      delivered_count: deliveredCount,
      gross_earnings: grossEarnings,
      average_per_order: deliveredCount > 0 ? Math.floor(grossEarnings / deliveredCount) : 0,
      active_status: active?.status ?? null,
      rating_avg: courier?.ratingAvg ?? null,
      rating_count: courier?.ratingCount ?? null,
      orders: orders.map((order) => ({
        order_id: order.id,
        status: order.status,
        vendor_id: order.vendorId,
        fulfillment_type: order.fulfillmentType,
        total: order.total,
        delivery_fee: order.deliveryFee,
        created_at: order.createdAt,
      })),
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        vendor_id: rating.vendorId,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
      })),
    });
  });

  app.patch("/admin/couriers/:courierId", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const courierId = (request.params as { courierId: string }).courierId;
    const payload = request.body as {
      full_name?: string | null;
      phone?: string | null;
      telegram_username?: string | null;
      photo_url?: string | null;
      delivery_method?: DeliveryMethod | string | null;
      is_available?: boolean;
      max_active_orders?: number;
    };

    const courier = await (prisma as PrismaClient).courier.update({
      where: { id: courierId },
      data: {
        fullName: payload.full_name === undefined ? undefined : payload.full_name,
        phone: payload.phone === undefined ? undefined : payload.phone,
        telegramUsername:
          payload.telegram_username === undefined ? undefined : payload.telegram_username,
        photoUrl: payload.photo_url === undefined ? undefined : payload.photo_url,
        deliveryMethod:
          payload.delivery_method === undefined
            ? undefined
            : (payload.delivery_method as DeliveryMethod | null),
        isAvailable: payload.is_available === undefined ? undefined : payload.is_available,
        maxActiveOrders:
          payload.max_active_orders === undefined ? undefined : payload.max_active_orders,
      },
    });

    return reply.send({
      courier_id: courier.id,
      full_name: courier.fullName,
      phone: courier.phone,
      telegram_username: courier.telegramUsername,
      delivery_method: courier.deliveryMethod,
      is_available: courier.isAvailable,
      max_active_orders: courier.maxActiveOrders,
    });
  });

  app.get("/admin/couriers/:courierId/orders", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const courierId = (request.params as { courierId: string }).courierId;
    const orders = await (prisma as PrismaClient).order.findMany({
      where: { courierId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      orders: orders.map((order) => ({
        order_id: order.id,
        status: order.status,
        vendor_id: order.vendorId,
        fulfillment_type: order.fulfillmentType,
        total: order.total,
        delivery_fee: order.deliveryFee,
        created_at: order.createdAt,
      })),
    });
  });

  app.get("/admin/couriers/:courierId/finance", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const courierId = (request.params as { courierId: string }).courierId;
    const range = parseRangeQuery(request.query as { range?: string; from?: string; to?: string });
    const orders = await (prisma as PrismaClient).order.findMany({
      where: { courierId, createdAt: { gte: range.from, lte: range.to } },
    });

    const delivered = orders.filter((order) => order.status === OrderStatus.DELIVERED);
    const gross = delivered.reduce((sum, order) => sum + order.deliveryFee, 0);
    const count = delivered.length;
    return reply.send({
      from: range.from,
      to: range.to,
      completed_count: count,
      gross_earnings: gross,
      average_per_order: count > 0 ? Math.floor(gross / count) : 0,
    });
  });

  app.get("/admin/couriers/:courierId/reviews", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const courierId = (request.params as { courierId: string }).courierId;
    const ratings = await (prisma as PrismaClient).rating.findMany({
      where: { courierId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      ratings: ratings.map((rating) => ({
        order_id: rating.orderId,
        vendor_id: rating.vendorId,
        courier_stars: rating.courierStars,
        courier_comment: rating.courierComment,
        created_at: rating.createdAt,
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
        priority: promo.priority,
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

  app.get("/admin/finance", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const range = parseRangeQuery(request.query as { range?: string; from?: string; to?: string });

    const [orders, vendors] = await Promise.all([
      (prisma as PrismaClient).order.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      (prisma as PrismaClient).vendor.findMany({
        select: { id: true, name: true },
      }),
    ]);
    const vendorName = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
    const summary = computeFinanceSummary(
      orders.map((order) => ({
        vendorId: order.vendorId,
        itemsSubtotal: order.itemsSubtotal,
        discountTotal: order.discountTotal,
        promoCodeDiscount: order.promoCodeDiscount,
        serviceFee: order.serviceFee,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
      })),
    );
    const byVendor = computeFinanceByVendor(
      orders.map((order) => ({
        vendorId: order.vendorId,
        itemsSubtotal: order.itemsSubtotal,
        discountTotal: order.discountTotal,
        promoCodeDiscount: order.promoCodeDiscount,
        serviceFee: order.serviceFee,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
      })),
    ).map((row) => ({
      ...row,
      vendor_name: vendorName.get(row.vendor_id) ?? row.vendor_id,
    }));

    return reply.send({ ...summary, from: range.from, to: range.to, by_vendor: byVendor });
  });

  app.get("/admin/vendors/:vendorId/dashboard", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const range = (request.query as { range?: string }).range ?? "7d";
    const days = range.endsWith("d") ? Number(range.replace("d", "")) : 7;
    const start = new Date();
    start.setDate(start.getDate() - (Number.isFinite(days) ? days : 7));

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId,
        status: OrderStatus.DELIVERED,
        createdAt: { gte: start },
      },
      orderBy: { createdAt: "desc" },
    });
    const vendor = await (prisma as PrismaClient).vendor.findUnique({ where: { id: vendorId } });

    return reply.send(
      computeVendorDashboard(orders, vendor, Number.isFinite(days) ? days : 7),
    );
  });

  app.get("/admin/vendors/:vendorId/stats", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const range = parseRangeQuery(request.query as { range?: string; from?: string; to?: string });
    const days = Math.max(
      1,
      Math.round((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const [orders, vendor] = await Promise.all([
      (prisma as PrismaClient).order.findMany({
        where: {
          vendorId,
          status: OrderStatus.DELIVERED,
          createdAt: { gte: range.from, lte: range.to },
        },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).vendor.findUnique({ where: { id: vendorId } }),
    ]);

    const stats = computeVendorDashboard(orders, vendor, days);
    return reply.send({ ...stats, from: range.from, to: range.to });
  });

  app.get("/admin/vendors/:vendorId/finance", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const range = parseRangeQuery(request.query as { range?: string; from?: string; to?: string });

    const orders = await (prisma as PrismaClient).order.findMany({
      where: {
        vendorId,
        createdAt: { gte: range.from, lte: range.to },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      ...computeFinanceSummary(
        orders.map((order) => ({
          vendorId: order.vendorId,
          itemsSubtotal: order.itemsSubtotal,
          discountTotal: order.discountTotal,
          promoCodeDiscount: order.promoCodeDiscount,
          serviceFee: order.serviceFee,
          deliveryFee: order.deliveryFee,
          total: order.total,
          status: order.status,
        })),
      ),
      from: range.from,
      to: range.to,
    });
  });

  app.get("/admin/vendors/:vendorId/reviews", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const reviews = await (prisma as PrismaClient).rating.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return reply.send({
      reviews: reviews.map((review) => ({
        order_id: review.orderId,
        vendor_stars: review.vendorStars,
        vendor_comment: review.vendorComment,
        courier_stars: review.courierStars,
        courier_comment: review.courierComment,
        created_at: review.createdAt,
      })),
    });
  });

  app.get("/admin/vendors/:vendorId/promotions", async (request, reply) => {
    try {
      requireAdminFromHeaders(request.headers);
    } catch (error) {
      return handleAdminAuthError(reply, error);
    }

    const vendorId = (request.params as { vendorId: string }).vendorId;
    const promotions = await (prisma as PrismaClient).promotion.findMany({
      where: { vendorId },
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
        priority: promo.priority,
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

    const normalizedCode = normalizePromoCode(payload.code ?? null);
    if (!normalizedCode || !payload.type || typeof payload.value !== "number") {
      return reply.status(400).send({ message: "code, type, and value are required" });
    }

    const promo = await (prisma as PrismaClient).promoCode.create({
      data: {
        code: normalizedCode,
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

    const normalizedUpdate =
      payload.code === undefined ? undefined : normalizePromoCode(payload.code);
    if (payload.code !== undefined && !normalizedUpdate) {
      return reply.status(400).send({ message: "code is required" });
    }

    const promo = await (prisma as PrismaClient).promoCode.update({
      where: { id: promoId },
      data: {
        code: normalizedUpdate,
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

    const clientId = resolveClientId(request, role);
    if (!clientId) {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const payload = request.body as { code?: string };
    const normalizedCode = normalizePromoCode(payload.code ?? null);
    if (!normalizedCode) {
      return reply.status(400).send({ message: "code is required" });
    }

    await (prisma as PrismaClient).client.upsert({
      where: { id: clientId },
      update: {},
      create: { id: clientId },
    });

    const promo = await (prisma as PrismaClient).promoCode.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: "insensitive",
        },
      },
    });
    if (!promo) {
      return reply.status(404).send({ message: "promo_code not found" });
    }
    if (!isPromoCodeActive(promo)) {
      return reply.status(400).send({ message: "promo_code inactive or expired" });
    }
    const redemption = await (prisma as PrismaClient).promoCodeRedemption.findUnique({
      where: { promoCodeId_clientId: { promoCodeId: promo.id, clientId } },
    });
    if (redemption) {
      return reply
        .status(400)
        .send({ message: "promo_code already used", code: "PROMO_ALREADY_USED" });
    }

    const entry = await (prisma as PrismaClient).clientPromoCode.upsert({
      where: { clientId_promoCodeId: { clientId, promoCodeId: promo.id } },
      update: {},
      create: { clientId, promoCodeId: promo.id },
      include: { promoCode: true },
    });

    const status = promoCodeStatus(entry.promoCode, false);
    return reply.send({
      id: entry.id,
      code: entry.promoCode.code,
      type: entry.promoCode.type,
      value: entry.promoCode.value,
      status,
      used: false,
    });
  });

  app.get("/client/profile/promo-codes", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId) {
      return reply.status(401).send({ message: "telegram initData is required" });
    }

    const [entries, redemptions] = await Promise.all([
      (prisma as PrismaClient).clientPromoCode.findMany({
        where: { clientId },
        include: { promoCode: true },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as PrismaClient).promoCodeRedemption.findMany({
        where: { clientId },
        select: { promoCodeId: true },
      }),
    ]);
    const redeemed = new Set(redemptions.map((entry) => entry.promoCodeId));

    return reply.send({
      promo_codes: entries.map((entry) => ({
        id: entry.id,
        code: entry.promoCode.code,
        type: entry.promoCode.type,
        value: entry.promoCode.value,
        is_active: entry.promoCode.isActive,
        status: promoCodeStatus(entry.promoCode, redeemed.has(entry.promoCodeId)),
        used: redeemed.has(entry.promoCodeId),
      })),
    });
  });

  app.delete("/client/profile/promo-codes/:id", async (request, reply) => {
    const role = readRole(request);
    if (!role || (role !== "CLIENT" && role !== "ADMIN")) {
      return reply.status(403).send({ message: "Forbidden" });
    }

    const clientId = resolveClientId(request, role);
    if (!clientId) {
      return reply.status(401).send({ message: "telegram initData is required" });
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
  const devUser = readHeader(request, DEV_USER_HEADER);
  if (DEV_MODE && devUser) {
    if (devUser === "client") {
      return "CLIENT";
    }
    if (devUser === "courier") {
      return "COURIER";
    }
    if (devUser === "vendor") {
      return "VENDOR";
    }
  }
  const raw = readHeader(request, "x-role");
  if (raw === "ADMIN" || raw === "CLIENT" || raw === "COURIER" || raw === "VENDOR") {
    return raw;
  }
  return null;
}

function parseTelegramUserId(initData: string | undefined): string | null {
  if (!initData) {
    return null;
  }
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) {
    return null;
  }
  try {
    const user = JSON.parse(userRaw) as { id?: number | string };
    if (user?.id !== undefined && user?.id !== null) {
      return `tg:${user.id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveClientId(
  request: { headers: Record<string, string | string[] | undefined> },
  role: Role,
): string | null {
  const devUser = readHeader(request, DEV_USER_HEADER);
  if (DEV_MODE && devUser === "client") {
    return DEV_CLIENT_ID;
  }
  const initData = readHeader(request, "x-telegram-init-data");
  const tgId = parseTelegramUserId(initData);
  if (tgId) {
    return tgId;
  }
  if (role === "ADMIN") {
    return readHeader(request, "x-client-id") ?? null;
  }
  if (DEV_MODE) {
    return DEV_CLIENT_ID;
  }
  return null;
}

function resolveCourierId(
  request: { headers: Record<string, string | string[] | undefined> },
  role: Role,
): string | null {
  const devUser = readHeader(request, DEV_USER_HEADER);
  if (DEV_MODE && devUser === "courier") {
    return DEV_COURIER_ID;
  }
  const initData = readHeader(request, "x-telegram-init-data");
  const tgId = parseTelegramUserId(initData);
  if (tgId) {
    return tgId;
  }
  if (role === "ADMIN") {
    return readHeader(request, "x-courier-id") ?? null;
  }
  if (DEV_MODE) {
    return DEV_COURIER_ID;
  }
  return null;
}

function handleAdminAuthError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.statusCode ?? 401).send({ message: error.message });
  }
  return reply.status(401).send({ message: "Unauthorized" });
}

function normalizePromoCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  const normalized = code.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function isPromoCodeActive(promo: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  if (!promo.isActive) {
    return false;
  }
  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) {
    return false;
  }
  if (promo.endsAt && now > promo.endsAt) {
    return false;
  }
  return true;
}

function promoCodeErrorMessage(
  promo: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
    usedCount: number;
    minOrderSum: number | null;
  } | null,
  itemsSubtotal: number,
  discountTotal: number,
) {
  if (!promo) {
    return "promo_code not found";
  }
  if (!isPromoCodeActive(promo)) {
    return "promo_code inactive or expired";
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return "promo_code not applicable";
  }
  if (promo.minOrderSum !== null && itemsSubtotal < promo.minOrderSum) {
    return "promo_code not applicable";
  }
  const base = Math.max(itemsSubtotal - discountTotal, 0);
  if (base <= 0) {
    return "promo_code not applicable";
  }
  return "promo_code not applicable";
}

function parseRangeQuery(query: {
  range?: string;
  from?: string;
  to?: string;
}): { from: Date; to: Date } {
  if (query.from && query.to) {
    return { from: new Date(query.from), to: new Date(query.to) };
  }
  const now = new Date();
  if (query.range === "month") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to: now };
  }
  if (query.range === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from, to: now };
  }
  return { from: new Date(0), to: now };
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
  createdAt: Date;
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
    created_at: order.createdAt,
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

function mapMenuItem(item: {
  id: string;
  vendorId: string;
  title: string;
  description: string | null;
  weightValue: number | null;
  weightUnit: string | null;
  price: number;
  isAvailable: boolean;
  category: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    vendor_id: item.vendorId,
    title: item.title,
    description: item.description,
    weight_value: item.weightValue,
    weight_unit: item.weightUnit,
    price: item.price,
    is_available: item.isAvailable,
    category: item.category,
    image_url: item.imageUrl,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

type PromotionPayload = {
  promo_type?: PromotionType;
  value_numeric?: number;
  priority?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  items?: string[];
  combo_items?: Array<{ menu_item_id: string; quantity: number }>;
  buy_x_get_y?: {
    buy_item_id: string;
    buy_quantity: number;
    get_item_id: string;
    get_quantity: number;
    discount_percent: number;
  } | null;
  gift?: {
    gift_item_id: string;
    gift_quantity: number;
    min_order_amount: number;
  } | null;
};

function resolvePromotionValue(
  promoType: PromotionType,
  value: number | undefined,
): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (promoType === PromotionType.BUY_X_GET_Y || promoType === PromotionType.GIFT) {
    return 0;
  }
  return null;
}

function buildPromotionRelations(promoType: PromotionType, payload: PromotionPayload) {
  if (promoType === PromotionType.FIXED_PRICE || promoType === PromotionType.PERCENT) {
    const items = payload.items ?? [];
    if (items.length === 0) {
      throw new Error("items are required");
    }
    return {
      promotionItems: {
        create: items.map((id) => ({ menuItemId: id })),
      },
    };
  }

  if (promoType === PromotionType.COMBO) {
    const comboItems = payload.combo_items ?? [];
    if (comboItems.length === 0) {
      throw new Error("combo_items are required");
    }
    for (const item of comboItems) {
      if (!item.menu_item_id || item.quantity <= 0) {
        throw new Error("combo_items must include menu_item_id and quantity");
      }
    }
    return {
      comboItems: {
        create: comboItems.map((item) => ({
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
        })),
      },
    };
  }

  if (promoType === PromotionType.BUY_X_GET_Y) {
    const rule = payload.buy_x_get_y;
    if (!rule) {
      throw new Error("buy_x_get_y is required");
    }
    if (!rule.buy_item_id || !rule.get_item_id || rule.buy_quantity <= 0 || rule.get_quantity <= 0) {
      throw new Error("buy_x_get_y must include item ids and quantities");
    }
    return {
      buyXGetY: {
        create: {
          buyItemId: rule.buy_item_id,
          buyQuantity: rule.buy_quantity,
          getItemId: rule.get_item_id,
          getQuantity: rule.get_quantity,
          discountPercent: rule.discount_percent,
        },
      },
    };
  }

  if (promoType === PromotionType.GIFT) {
    const gift = payload.gift;
    if (!gift) {
      throw new Error("gift is required");
    }
    if (!gift.gift_item_id || gift.gift_quantity <= 0) {
      throw new Error("gift must include item id and quantity");
    }
    return {
      gift: {
        create: {
          giftItemId: gift.gift_item_id,
          giftQuantity: gift.gift_quantity,
          minOrderAmount: gift.min_order_amount,
        },
      },
    };
  }

  return {};
}
