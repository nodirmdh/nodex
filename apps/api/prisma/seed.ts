import { PrismaClient, PromotionType, PromoCodeType, VendorCategory } from "@prisma/client";

const prisma = new PrismaClient();

type VendorSeed = {
  id: string;
  name: string;
  phone: string;
  inn: string;
  category: VendorCategory;
  supportsPickup: boolean;
  addressText: string;
  geoLat: number;
  geoLng: number;
  openingHours: string;
};

type MenuItemSeed = {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  price: number;
  isAvailable: boolean;
  category: string;
  imageUrl: string | null;
};

const vendors: VendorSeed[] = [
  {
    id: "vendor-dev-1",
    name: "Sequoia Grill",
    phone: "+7 495 111-01-01",
    inn: "7701001001",
    category: VendorCategory.RESTAURANTS,
    supportsPickup: true,
    addressText: "12 Tverskaya St, Moscow",
    geoLat: 55.7577,
    geoLng: 37.6136,
    openingHours: "10:00-22:00",
  },
  {
    id: "vendor-dev-2",
    name: "Metro Pharmacy",
    phone: "+7 495 222-02-02",
    inn: "7702002002",
    category: VendorCategory.PHARMACY,
    supportsPickup: false,
    addressText: "33 Arbat St, Moscow",
    geoLat: 55.752,
    geoLng: 37.5922,
    openingHours: "09:00-23:00",
  },
  {
    id: "vendor-dev-3",
    name: "Fresh Market",
    phone: "+7 495 333-03-03",
    inn: "7703003003",
    category: VendorCategory.MARKET,
    supportsPickup: false,
    addressText: "8 Sretenka St, Moscow",
    geoLat: 55.7669,
    geoLng: 37.6352,
    openingHours: "08:00-22:00",
  },
  {
    id: "vendor-dev-4",
    name: "City Essentials",
    phone: "+7 495 444-04-04",
    inn: "7704004004",
    category: VendorCategory.PRODUCTS,
    supportsPickup: false,
    addressText: "5 Novaya Ploshchad, Moscow",
    geoLat: 55.7555,
    geoLng: 37.6266,
    openingHours: "10:00-21:00",
  },
  {
    id: "vendor-dev-5",
    name: "Riverside Bistro",
    phone: "+7 495 555-05-05",
    inn: "7705005005",
    category: VendorCategory.RESTAURANTS,
    supportsPickup: true,
    addressText: "20 Kutuzovsky Ave, Moscow",
    geoLat: 55.7416,
    geoLng: 37.5456,
    openingHours: "11:00-23:00",
  },
];

const menuItems: MenuItemSeed[] = [
  ...buildMenu("vendor-dev-1", "Grill", [
    ["Smoked Burger", 12900],
    ["Charred Chicken", 11800],
    ["Pepper Steak", 17900],
    ["Garden Salad", 7400],
    ["Sweet Potato Fries", 5900],
    ["Cedar Lemonade", 3200],
    ["BBQ Wings", 9900],
    ["Herb Rice Bowl", 8200],
  ]),
  ...buildMenu("vendor-dev-2", "Pharmacy", [
    ["Vitamin C 1000mg", 2100],
    ["Pain Relief Gel", 3500],
    ["Hydration Salts", 1800],
    ["Herbal Tea", 1400],
    ["Bandage Kit", 1200],
    ["Allergy Tabs", 2500],
    ["Antiseptic Spray", 1900],
    ["Daily Probiotic", 4200],
  ]),
  ...buildMenu("vendor-dev-3", "Market", [
    ["Organic Apples", 3200],
    ["Whole Milk", 1700],
    ["Brown Eggs", 2300],
    ["Fresh Bread", 1900],
    ["Tomatoes", 2600],
    ["Olive Oil", 7500],
    ["Greek Yogurt", 2100],
    ["Granola Pack", 2800],
  ]),
  ...buildMenu("vendor-dev-4", "Essentials", [
    ["Laundry Pods", 6800],
    ["Dish Soap", 2400],
    ["Paper Towels", 3100],
    ["Shampoo", 4100],
    ["Body Lotion", 3700],
    ["Toothpaste", 1600],
    ["Face Cleanser", 4500],
    ["Hand Sanitizer", 1900],
  ]),
  ...buildMenu("vendor-dev-5", "Bistro", [
    ["Truffle Pasta", 15500],
    ["Seared Salmon", 18500],
    ["Quinoa Bowl", 9900],
    ["Tomato Soup", 6200],
    ["Classic Burger", 12000],
    ["Iced Tea", 2900],
    ["Cheesecake", 5400],
    ["Berry Smoothie", 3600],
  ]),
];

function buildMenu(
  vendorId: string,
  category: string,
  items: Array<[string, number]>,
): MenuItemSeed[] {
  return items.map(([title, price], index) => ({
    id: `${vendorId}-item-${index + 1}`,
    vendorId,
    title,
    description: `${title} from ${category}`,
    price,
    isAvailable: true,
    category,
    imageUrl: null,
  }));
}

async function seed() {
  await prisma.$connect();

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { id: vendor.id },
      update: {
        name: vendor.name,
        phone: vendor.phone,
        inn: vendor.inn,
        category: vendor.category,
        supportsPickup: vendor.supportsPickup,
        addressText: vendor.addressText,
        isActive: true,
        openingHours: vendor.openingHours,
        payoutDetails: { bank: "Demo Bank", account: "40817810000000000000" },
        geoLat: vendor.geoLat,
        geoLng: vendor.geoLng,
      },
      create: {
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone,
        inn: vendor.inn,
        category: vendor.category,
        supportsPickup: vendor.supportsPickup,
        addressText: vendor.addressText,
        isActive: true,
        openingHours: vendor.openingHours,
        payoutDetails: { bank: "Demo Bank", account: "40817810000000000000" },
        geoLat: vendor.geoLat,
        geoLng: vendor.geoLng,
      },
    });
  }

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        vendorId: item.vendorId,
        title: item.title,
        description: item.description,
        price: item.price,
        isAvailable: item.isAvailable,
        category: item.category,
        imageUrl: item.imageUrl,
      },
      create: {
        id: item.id,
        vendorId: item.vendorId,
        title: item.title,
        description: item.description,
        price: item.price,
        isAvailable: item.isAvailable,
        category: item.category,
        imageUrl: item.imageUrl,
      },
    });
  }

  const percentPromoId = "promo-dev-1";
  const fixedPromoId = "promo-dev-2";

  await prisma.promotion.upsert({
    where: { id: percentPromoId },
    update: {
      vendorId: "vendor-dev-1",
      promoType: PromotionType.PERCENT,
      valueNumeric: 10,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    create: {
      id: percentPromoId,
      vendorId: "vendor-dev-1",
      promoType: PromotionType.PERCENT,
      valueNumeric: 10,
      isActive: true,
    },
  });

  await prisma.promotion.upsert({
    where: { id: fixedPromoId },
    update: {
      vendorId: "vendor-dev-5",
      promoType: PromotionType.FIXED_PRICE,
      valueNumeric: 9900,
      isActive: true,
      startsAt: null,
      endsAt: null,
    },
    create: {
      id: fixedPromoId,
      vendorId: "vendor-dev-5",
      promoType: PromotionType.FIXED_PRICE,
      valueNumeric: 9900,
      isActive: true,
    },
  });

  await prisma.promotionItem.createMany({
    data: [
      { promotionId: percentPromoId, menuItemId: "vendor-dev-1-item-1" },
      { promotionId: percentPromoId, menuItemId: "vendor-dev-1-item-2" },
      { promotionId: percentPromoId, menuItemId: "vendor-dev-1-item-3" },
      { promotionId: fixedPromoId, menuItemId: "vendor-dev-5-item-1" },
      { promotionId: fixedPromoId, menuItemId: "vendor-dev-5-item-2" },
    ],
    skipDuplicates: true,
  });

  await prisma.promoCode.upsert({
    where: { code: "SAVE10" },
    update: {
      type: PromoCodeType.PERCENT,
      value: 10,
      isActive: true,
    },
    create: {
      code: "SAVE10",
      type: PromoCodeType.PERCENT,
      value: 10,
      isActive: true,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: "FIXED300" },
    update: {
      type: PromoCodeType.FIXED,
      value: 300,
      isActive: true,
    },
    create: {
      code: "FIXED300",
      type: PromoCodeType.FIXED,
      value: 300,
      isActive: true,
    },
  });

  await prisma.client.upsert({
    where: { id: "dev-client-1" },
    update: {},
    create: { id: "dev-client-1" },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
