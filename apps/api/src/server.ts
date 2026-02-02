import Fastify, { FastifyInstance } from "fastify";

import { QuoteNotFoundError, quoteCart } from "./quote";
import { QuoteValidationError, QuoteContext } from "./pricing";
import { buildQuoteContextFromRepository, QuoteContextRepository } from "./quoteContext";
import { PrismaQuoteRepository } from "./repositories/prismaQuoteRepository";
import { PrismaClient } from "@prisma/client";

type BuildServerOptions = {
  quoteContextBuilder?: (
    vendorId: string,
    menuItemIds: string[],
  ) => Promise<QuoteContext>;
  repository?: QuoteContextRepository;
};

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const prisma = options.repository ? null : new PrismaClient();
  const quoteRepository =
    options.repository ?? new PrismaQuoteRepository(prisma as PrismaClient);
  const quoteContextBuilder =
    options.quoteContextBuilder ??
    ((vendorId, menuItemIds) =>
      buildQuoteContextFromRepository(quoteRepository, vendorId, menuItemIds));

  app.post("/client/cart/quote", async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    const menuItemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const menuItemIds = menuItemsPayload
      .map((item) => (item as { menu_item_id?: string }).menu_item_id)
      .filter((itemId): itemId is string => Boolean(itemId));

    const vendorId = typeof payload.vendor_id === "string" ? payload.vendor_id : "";
    const context = await quoteContextBuilder(vendorId, menuItemIds);

    try {
      const result = quoteCart(payload, context);
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

  app.addHook("onClose", async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  return app;
}
