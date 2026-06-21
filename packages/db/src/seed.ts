import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createTenantSchema } from './schema/tenant'
import { tenants } from './schema/public'
import { publicDb } from './client'

const sql = postgres(process.env.DATABASE_URL!)

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Ensure public schema exists and create tenant record
  await sql`CREATE SCHEMA IF NOT EXISTS tastytime`

  const [tenant] = await publicDb
    .insert(tenants)
    .values({
      id: 'tastytime',
      slug: 'tastytime',
      name: 'Tasty Time',
      schema: 'tastytime',
      currency: 'MAD',
      defaultLocale: 'fr',
      address: 'Avenue des Saveurs, Quartier Gourmand, Casablanca - Maroc',
      phone: '0700880474',
      logoUrl: null,
    })
    .onConflictDoNothing()
    .returning()

  if (!tenant) {
    console.log('Tenant already exists, skipping seed.')
    await sql.end()
    return
  }

  // 2. Create tenant tables
  const { categories, products, optionGroups, options } = createTenantSchema('tastytime')
  const db = drizzle(sql, { schema: createTenantSchema('tastytime') })

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name_fr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES tastytime.categories(id),
      name_fr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      description_fr TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_ar TEXT NOT NULL DEFAULT '',
      ingredients_fr TEXT NOT NULL DEFAULT '',
      ingredients_en TEXT NOT NULL DEFAULT '',
      ingredients_ar TEXT NOT NULL DEFAULT '',
      allergens JSONB NOT NULL DEFAULT '[]',
      images JSONB NOT NULL DEFAULT '[]',
      base_price NUMERIC(10,2) NOT NULL,
      calories INTEGER,
      prep_time_minutes INTEGER NOT NULL DEFAULT 15,
      is_available BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.option_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES tastytime.products(id) ON DELETE CASCADE,
      name_fr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      required BOOLEAN NOT NULL DEFAULT false,
      min_select INTEGER NOT NULL DEFAULT 0,
      max_select INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.options (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      option_group_id UUID NOT NULL REFERENCES tastytime.option_groups(id) ON DELETE CASCADE,
      name_fr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
      is_available BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.promo_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value NUMERIC(10,2) NOT NULL,
      min_order_amount NUMERIC(10,2),
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
      valid_until TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      avatar_url TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      birthday TEXT,
      referred_by TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id TEXT REFERENCES tastytime.users(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      items JSONB NOT NULL DEFAULT '[]',
      subtotal NUMERIC(10,2) NOT NULL,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      tip NUMERIC(10,2) NOT NULL DEFAULT 0,
      tax NUMERIC(10,2) NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL,
      promo_code_id UUID REFERENCES tastytime.promo_codes(id),
      promo_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
      address TEXT,
      table_number TEXT,
      scheduled_at TIMESTAMPTZ,
      notes TEXT,
      driver_id TEXT,
      estimated_prep_minutes INTEGER NOT NULL DEFAULT 20,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.loyalty_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id TEXT NOT NULL REFERENCES tastytime.users(id),
      points INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      order_id UUID REFERENCES tastytime.orders(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'g',
      current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
      low_stock_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS tastytime.drivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES tastytime.users(id),
      is_online BOOLEAN NOT NULL DEFAULT false,
      current_lat NUMERIC(10,7),
      current_lng NUMERIC(10,7),
      assigned_order_id UUID REFERENCES tastytime.orders(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  // 3. Seed categories (real Tasty Time menu)
  const categoryData = [
    { slug: 'tacos', nameFr: 'Tacos', nameEn: 'Tacos', nameAr: 'تاكوس', sortOrder: 1 },
    { slug: 'poutines', nameFr: 'Poutines', nameEn: 'Poutines', nameAr: 'بوتين', sortOrder: 2 },
    { slug: 'sandwiches', nameFr: 'Sandwiches', nameEn: 'Sandwiches', nameAr: 'ساندويشات', sortOrder: 3 },
    { slug: 'burgers', nameFr: 'Burgers', nameEn: 'Burgers', nameAr: 'برغر', sortOrder: 4 },
    { slug: 'brunch', nameFr: 'Brunch', nameEn: 'Brunch', nameAr: 'برانش', sortOrder: 5 },
    { slug: 'breakfast', nameFr: 'Breakfast', nameEn: 'Breakfast', nameAr: 'فطور', sortOrder: 6 },
    { slug: 'salades', nameFr: 'Salades', nameEn: 'Salads', nameAr: 'سلطات', sortOrder: 7 },
    { slug: 'jus-frais', nameFr: 'Jus Frais', nameEn: 'Fresh Juices', nameAr: 'عصائر طازجة', sortOrder: 8 },
    { slug: 'smoothies', nameFr: 'Smoothies', nameEn: 'Smoothies', nameAr: 'سموثي', sortOrder: 9 },
    { slug: 'cafe', nameFr: 'Café', nameEn: 'Coffee', nameAr: 'قهوة', sortOrder: 10 },
    { slug: 'desserts', nameFr: 'Desserts', nameEn: 'Desserts', nameAr: 'حلويات', sortOrder: 11 },
    { slug: 'menu-enfants', nameFr: 'Menu Enfants', nameEn: "Kids Menu", nameAr: 'قائمة الأطفال', sortOrder: 12 },
    { slug: 'boissons', nameFr: 'Boissons', nameEn: 'Drinks', nameAr: 'مشروبات', sortOrder: 13 },
  ]

  const insertedCategories: Record<string, string> = {}
  for (const cat of categoryData) {
    const [inserted] = await sql`
      INSERT INTO tastytime.categories (slug, name_fr, name_en, name_ar, sort_order)
      VALUES (${cat.slug}, ${cat.nameFr}, ${cat.nameEn}, ${cat.nameAr}, ${cat.sortOrder})
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, slug
    `
    if (inserted) insertedCategories[cat.slug] = inserted.id
  }

  // 4. Seed products — real menu from images
  type ProductInput = {
    categorySlug: string
    nameFr: string
    nameEn: string
    nameAr: string
    descriptionFr: string
    basePrice: number
    prepTime: number
    optionGroups?: Array<{
      nameFr: string
      nameEn: string
      nameAr: string
      required: boolean
      minSelect: number
      maxSelect: number
      options: Array<{ nameFr: string; nameEn: string; nameAr: string; priceDelta: number }>
    }>
  }

  const productData: ProductInput[] = [
    // ── TACOS (avec Frites et Boisson) ─────────────────────────────────────────
    {
      categorySlug: 'tacos',
      nameFr: 'Tacos Poulet',
      nameEn: 'Chicken Tacos',
      nameAr: 'تاكوس دجاج',
      descriptionFr: 'Tacos poulet avec frites et boisson. Option gratiné au cheddar +10dhs.',
      basePrice: 30,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Gratiné', nameEn: 'Melted Cheese', nameAr: 'مع جبن مذاب',
          required: false, minSelect: 0, maxSelect: 1,
          options: [
            { nameFr: 'Gratiné au cheddar', nameEn: 'Melted cheddar', nameAr: 'جبن شيدر مذاب', priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categorySlug: 'tacos',
      nameFr: 'Tacos Viande Hachée',
      nameEn: 'Ground Beef Tacos',
      nameAr: 'تاكوس لحم مفروم',
      descriptionFr: 'Tacos viande hachée avec frites et boisson. Option gratiné au cheddar +10dhs.',
      basePrice: 30,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Gratiné', nameEn: 'Melted Cheese', nameAr: 'مع جبن مذاب',
          required: false, minSelect: 0, maxSelect: 1,
          options: [
            { nameFr: 'Gratiné au cheddar', nameEn: 'Melted cheddar', nameAr: 'جبن شيدر مذاب', priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categorySlug: 'tacos',
      nameFr: 'Tacos Nuggets',
      nameEn: 'Nuggets Tacos',
      nameAr: 'تاكوس نغتس',
      descriptionFr: 'Tacos nuggets avec frites et boisson. Option gratiné au cheddar +10dhs.',
      basePrice: 30,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Gratiné', nameEn: 'Melted Cheese', nameAr: 'مع جبن مذاب',
          required: false, minSelect: 0, maxSelect: 1,
          options: [
            { nameFr: 'Gratiné au cheddar', nameEn: 'Melted cheddar', nameAr: 'جبن شيدر مذاب', priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categorySlug: 'tacos',
      nameFr: 'Tacos Tenders',
      nameEn: 'Tenders Tacos',
      nameAr: 'تاكوس تندرز',
      descriptionFr: 'Tacos tenders avec frites et boisson. Option gratiné au cheddar +10dhs.',
      basePrice: 30,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Gratiné', nameEn: 'Melted Cheese', nameAr: 'مع جبن مذاب',
          required: false, minSelect: 0, maxSelect: 1,
          options: [
            { nameFr: 'Gratiné au cheddar', nameEn: 'Melted cheddar', nameAr: 'جبن شيدر مذاب', priceDelta: 10 },
          ],
        },
      ],
    },
    {
      categorySlug: 'tacos',
      nameFr: 'Tacos Mixte',
      nameEn: 'Mixed Tacos',
      nameAr: 'تاكوس مشكل',
      descriptionFr: 'Tacos mixte (poulet + viande) avec frites et boisson. Option gratiné au cheddar +10dhs.',
      basePrice: 35,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Gratiné', nameEn: 'Melted Cheese', nameAr: 'مع جبن مذاب',
          required: false, minSelect: 0, maxSelect: 1,
          options: [
            { nameFr: 'Gratiné au cheddar', nameEn: 'Melted cheddar', nameAr: 'جبن شيدر مذاب', priceDelta: 10 },
          ],
        },
      ],
    },

    // ── POUTINES ───────────────────────────────────────────────────────────────
    {
      categorySlug: 'poutines',
      nameFr: 'Poutine Viande Hachée',
      nameEn: 'Ground Beef Poutine',
      nameAr: 'بوتين لحم مفروم',
      descriptionFr: 'Frites, fromage en grains, sauce et viande hachée.',
      basePrice: 25,
      prepTime: 12,
    },
    {
      categorySlug: 'poutines',
      nameFr: 'Poutine Dinde Fumée ou Poulet',
      nameEn: 'Smoked Turkey or Chicken Poutine',
      nameAr: 'بوتين ديك رومي مدخن أو دجاج',
      descriptionFr: 'Frites, fromage en grains, sauce et dinde fumée ou poulet.',
      basePrice: 25,
      prepTime: 12,
      optionGroups: [
        {
          nameFr: 'Viande', nameEn: 'Meat', nameAr: 'اللحم',
          required: true, minSelect: 1, maxSelect: 1,
          options: [
            { nameFr: 'Dinde fumée', nameEn: 'Smoked turkey', nameAr: 'ديك رومي مدخن', priceDelta: 0 },
            { nameFr: 'Poulet', nameEn: 'Chicken', nameAr: 'دجاج', priceDelta: 0 },
          ],
        },
      ],
    },
    {
      categorySlug: 'poutines',
      nameFr: 'Poutine Fingers',
      nameEn: 'Chicken Fingers Poutine',
      nameAr: 'بوتين أصابع الدجاج',
      descriptionFr: 'Frites, fromage en grains, sauce et chicken fingers.',
      basePrice: 25,
      prepTime: 12,
    },

    // ── SANDWICHES (avec frites) ───────────────────────────────────────────────
    {
      categorySlug: 'sandwiches',
      nameFr: 'Sandwich Turkish',
      nameEn: 'Turkish Sandwich',
      nameAr: 'ساندويش تركي',
      descriptionFr: 'Émincé de poulet assaisonnement turc, oignons, tomate, salade verte, fromage. Avec frites.',
      basePrice: 28,
      prepTime: 15,
    },
    {
      categorySlug: 'sandwiches',
      nameFr: 'Sandwich Kebab',
      nameEn: 'Kebab Sandwich',
      nameAr: 'ساندويش كباب',
      descriptionFr: 'Émincé de poulet à la sauce kebab, oignons, tomate, salade verte, coriandre, fromage. Avec frites.',
      basePrice: 32,
      prepTime: 15,
    },
    {
      categorySlug: 'sandwiches',
      nameFr: 'Sandwich American',
      nameEn: 'American Sandwich',
      nameAr: 'ساندويش أمريكي',
      descriptionFr: 'Émincé de bœuf à la sauce barbecue, oignons rings, salade verte, tomate, fromage. Avec frites.',
      basePrice: 34,
      prepTime: 15,
    },
    {
      categorySlug: 'sandwiches',
      nameFr: 'Sandwich Mixte',
      nameEn: 'Mixed Sandwich',
      nameAr: 'ساندويش مشكل',
      descriptionFr: 'Émincé de bœuf et poulet, oignons, tomate, salade verte, cornichons, fromage. Avec frites.',
      basePrice: 36,
      prepTime: 15,
    },

    // ── MENU ENFANTS ───────────────────────────────────────────────────────────
    {
      categorySlug: 'menu-enfants',
      nameFr: 'Menu Enfants',
      nameEn: "Kids Menu",
      nameAr: 'وجبة الأطفال',
      descriptionFr: 'Pizza, Burger ou Nuggets + Frites + Boisson.',
      basePrice: 32,
      prepTime: 15,
      optionGroups: [
        {
          nameFr: 'Plat principal', nameEn: 'Main dish', nameAr: 'الطبق الرئيسي',
          required: true, minSelect: 1, maxSelect: 1,
          options: [
            { nameFr: 'Pizza', nameEn: 'Pizza', nameAr: 'بيتزا', priceDelta: 0 },
            { nameFr: 'Burger', nameEn: 'Burger', nameAr: 'برغر', priceDelta: 0 },
            { nameFr: 'Nuggets', nameEn: 'Nuggets', nameAr: 'نغتس', priceDelta: 0 },
          ],
        },
      ],
    },

    // ── BOISSONS ───────────────────────────────────────────────────────────────
    {
      categorySlug: 'boissons',
      nameFr: 'Soda',
      nameEn: 'Soda',
      nameAr: 'صودا',
      descriptionFr: 'Boisson gazeuse.',
      basePrice: 7,
      prepTime: 2,
    },
  ]

  for (const p of productData) {
    const catId = insertedCategories[p.categorySlug]
    if (!catId) continue

    const [prod] = await sql`
      INSERT INTO tastytime.products (
        category_id, name_fr, name_en, name_ar,
        description_fr, description_en, description_ar,
        base_price, prep_time_minutes, sort_order
      ) VALUES (
        ${catId}, ${p.nameFr}, ${p.nameEn}, ${p.nameAr},
        ${p.descriptionFr}, ${p.descriptionFr}, ${p.descriptionFr},
        ${p.basePrice}, ${p.prepTime}, 0
      ) RETURNING id
    `

    if (!prod || !p.optionGroups) continue

    for (let gi = 0; gi < p.optionGroups.length; gi++) {
      const g = p.optionGroups[gi]!
      const [group] = await sql`
        INSERT INTO tastytime.option_groups (
          product_id, name_fr, name_en, name_ar,
          required, min_select, max_select, sort_order
        ) VALUES (
          ${prod.id}, ${g.nameFr}, ${g.nameEn}, ${g.nameAr},
          ${g.required}, ${g.minSelect}, ${g.maxSelect}, ${gi}
        ) RETURNING id
      `
      if (!group) continue

      for (let oi = 0; oi < g.options.length; oi++) {
        const o = g.options[oi]!
        await sql`
          INSERT INTO tastytime.options (
            option_group_id, name_fr, name_en, name_ar, price_delta, sort_order
          ) VALUES (
            ${group.id}, ${o.nameFr}, ${o.nameEn}, ${o.nameAr}, ${o.priceDelta}, ${oi}
          )
        `
      }
    }
  }

  console.log('✅ Seed complete — Tasty Time menu loaded.')
  await sql.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
