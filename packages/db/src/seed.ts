import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL!
const sql = postgres(DB_URL, { ssl: 'require' })

async function main() {
  console.log('🌱 Seeding Tasty Time database...')

  // ── Public schema: tenants table ─────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      schema TEXT NOT NULL UNIQUE,
      currency TEXT NOT NULL DEFAULT 'MAD',
      default_locale TEXT NOT NULL DEFAULT 'fr',
      logo_url TEXT,
      address TEXT,
      phone TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    INSERT INTO public.tenants (id, slug, name, schema, currency, default_locale, address, phone)
    VALUES (
      'tastytime', 'tastytime', 'Tasty Time', 'tastytime', 'MAD', 'fr',
      'Avenue des Saveurs, Quartier Gourmand, Casablanca — Maroc',
      '+212 700 880 474'
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = now()
  `
  console.log('✓ Tenant upserted')

  // ── Tenant schema + tables ────────────────────────────────────────────────
  await sql`CREATE SCHEMA IF NOT EXISTS tastytime`

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
      description TEXT NOT NULL DEFAULT '',
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

  console.log('✓ Tables created')

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { slug: 'brunch',        nameFr: 'Brunch',          nameEn: 'Brunch',        nameAr: 'برانش',           sort: 1  },
    { slug: 'breakfast',     nameFr: 'Breakfast',       nameEn: 'Breakfast',     nameAr: 'فطور',            sort: 2  },
    { slug: 'burgers',       nameFr: 'Burgers',         nameEn: 'Burgers',       nameAr: 'برغر',            sort: 3  },
    { slug: 'sandwiches',    nameFr: 'Sandwiches',      nameEn: 'Sandwiches',    nameAr: 'ساندويشات',       sort: 4  },
    { slug: 'tacos',         nameFr: 'Tacos',           nameEn: 'Tacos',         nameAr: 'تاكوس',           sort: 5  },
    { slug: 'poutines',      nameFr: 'Poutines',        nameEn: 'Poutines',      nameAr: 'بوتين',           sort: 6  },
    { slug: 'salades',       nameFr: 'Salades',         nameEn: 'Salads',        nameAr: 'سلطات',           sort: 7  },
    { slug: 'jus-frais',     nameFr: 'Jus Frais',       nameEn: 'Fresh Juices',  nameAr: 'عصائر طازجة',    sort: 8  },
    { slug: 'smoothies',     nameFr: 'Smoothies',       nameEn: 'Smoothies',     nameAr: 'سموثي',           sort: 9  },
    { slug: 'cafe',          nameFr: 'Café',            nameEn: 'Coffee',        nameAr: 'قهوة',            sort: 10 },
    { slug: 'desserts',      nameFr: 'Desserts',        nameEn: 'Desserts',      nameAr: 'حلويات',          sort: 11 },
    { slug: 'menu-enfants',  nameFr: 'Menu Enfants',    nameEn: "Kids Menu",     nameAr: 'قائمة الأطفال',  sort: 12 },
    { slug: 'boissons',      nameFr: 'Boissons',        nameEn: 'Drinks',        nameAr: 'مشروبات',         sort: 13 },
  ]

  const catIds: Record<string, string> = {}
  for (const c of categories) {
    const [row] = await sql`
      INSERT INTO tastytime.categories (slug, name_fr, name_en, name_ar, sort_order)
      VALUES (${c.slug}, ${c.nameFr}, ${c.nameEn}, ${c.nameAr}, ${c.sort})
      ON CONFLICT (slug) DO UPDATE SET name_fr=EXCLUDED.name_fr, sort_order=EXCLUDED.sort_order
      RETURNING id, slug
    `
    catIds[c.slug] = row.id
  }
  console.log('✓ Categories seeded:', Object.keys(catIds).length)

  // ── Shared option group templates ─────────────────────────────────────────
  type Opt = { fr: string; en: string; ar: string; delta: number }
  type OG  = { nameFr: string; nameEn: string; nameAr: string; required: boolean; min: number; max: number; opts: Opt[] }

  const SAUCE_OPTS: Opt[] = [
    { fr: 'BBQ',          en: 'BBQ',          ar: 'صوص BBQ',        delta: 0 },
    { fr: 'Samurai',      en: 'Samurai',      ar: 'سمورا',          delta: 0 },
    { fr: 'Andalouse',    en: 'Andalouse',    ar: 'أندالوز',         delta: 0 },
    { fr: 'Ketchup',      en: 'Ketchup',      ar: 'كيتشاب',         delta: 0 },
    { fr: 'Mayo',         en: 'Mayonnaise',   ar: 'مايونيز',         delta: 0 },
    { fr: 'Algérienne',   en: 'Algerian',     ar: 'جزائرية',         delta: 0 },
    { fr: 'Harissa',      en: 'Harissa',      ar: 'هريسة',           delta: 0 },
  ]

  const CHEESE_OPTS: Opt[] = [
    { fr: 'Cheddar',      en: 'Cheddar',      ar: 'شيدر',            delta: 0 },
    { fr: 'Mozzarella',   en: 'Mozzarella',   ar: 'موزاريلا',        delta: 0 },
    { fr: 'Swiss',        en: 'Swiss',        ar: 'جبن سويسري',      delta: 0 },
  ]

  const BREAD_OPTS: Opt[] = [
    { fr: 'Brioche',      en: 'Brioche',      ar: 'بريوش',           delta: 0 },
    { fr: 'Bun Pomme de Terre', en: 'Potato Bun', ar: 'خبز البطاطس', delta: 0 },
    { fr: 'Sans Gluten',  en: 'Gluten Free',  ar: 'بدون غلوتين',     delta: 5 },
  ]

  const MEAT_OPTS: Opt[] = [
    { fr: 'Bœuf',         en: 'Beef',         ar: 'لحم بقري',        delta: 0 },
    { fr: 'Poulet',       en: 'Chicken',      ar: 'دجاج',            delta: 0 },
    { fr: 'Double Viande',en: 'Double Meat',  ar: 'مضاعفة اللحم',    delta: 15 },
  ]

  const EXTRAS_OPTS: Opt[] = [
    { fr: 'Œuf',          en: 'Egg',          ar: 'بيض',             delta: 5  },
    { fr: 'Bacon',        en: 'Bacon',        ar: 'بيكون',            delta: 8  },
    { fr: 'Onion Rings',  en: 'Onion Rings',  ar: 'حلقات البصل',     delta: 8  },
    { fr: 'Jalapeños',    en: 'Jalapeños',    ar: 'هالابينو',         delta: 5  },
    { fr: 'Extra Fromage',en: 'Extra Cheese', ar: 'جبن إضافي',       delta: 7  },
    { fr: 'Avocat',       en: 'Avocado',      ar: 'أفوكادو',          delta: 10 },
    { fr: 'Champignons',  en: 'Mushrooms',    ar: 'فطر',              delta: 8  },
  ]

  const BURGER_GROUPS: OG[] = [
    { nameFr: 'Viande',   nameEn: 'Meat',   nameAr: 'اللحم',    required: true,  min: 1, max: 1, opts: MEAT_OPTS },
    { nameFr: 'Pain',     nameEn: 'Bread',  nameAr: 'الخبز',    required: true,  min: 1, max: 1, opts: BREAD_OPTS },
    { nameFr: 'Fromage',  nameEn: 'Cheese', nameAr: 'الجبن',    required: false, min: 0, max: 1, opts: CHEESE_OPTS },
    { nameFr: 'Sauces',   nameEn: 'Sauces', nameAr: 'الصوصات',  required: false, min: 0, max: 3, opts: SAUCE_OPTS },
    { nameFr: 'Extras',   nameEn: 'Extras', nameAr: 'إضافات',   required: false, min: 0, max: 4, opts: EXTRAS_OPTS },
  ]

  const TACO_GROUPS: OG[] = [
    {
      nameFr: 'Viande', nameEn: 'Meat', nameAr: 'اللحم',
      required: true, min: 1, max: 1,
      opts: [
        { fr: 'Poulet',        en: 'Chicken',      ar: 'دجاج',         delta: 0  },
        { fr: 'Viande Hachée', en: 'Ground Beef',  ar: 'لحم مفروم',    delta: 0  },
        { fr: 'Nuggets',       en: 'Nuggets',      ar: 'نغتس',         delta: 0  },
        { fr: 'Tenders',       en: 'Tenders',      ar: 'تندرز',        delta: 0  },
        { fr: 'Mixte',         en: 'Mixed',        ar: 'مشكل',         delta: 5  },
      ],
    },
    { nameFr: 'Fromage', nameEn: 'Cheese', nameAr: 'الجبن', required: false, min: 0, max: 1,
      opts: [{ fr: 'Gratiné Cheddar', en: 'Melted Cheddar', ar: 'جبن شيدر مذاب', delta: 10 }] },
    { nameFr: 'Sauces', nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 2, opts: SAUCE_OPTS },
  ]

  const SANDWICH_GROUPS: OG[] = [
    { nameFr: 'Sauces', nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 2, opts: SAUCE_OPTS },
    { nameFr: 'Extras', nameEn: 'Extras', nameAr: 'إضافات',  required: false, min: 0, max: 3, opts: EXTRAS_OPTS },
  ]

  const COFFEE_SIZE: OG = {
    nameFr: 'Taille', nameEn: 'Size', nameAr: 'الحجم',
    required: true, min: 1, max: 1,
    opts: [
      { fr: 'Small',  en: 'Small',  ar: 'صغير',  delta: 0  },
      { fr: 'Medium', en: 'Medium', ar: 'وسط',   delta: 5  },
      { fr: 'Large',  en: 'Large',  ar: 'كبير',  delta: 10 },
    ],
  }

  const MILK_OPT: OG = {
    nameFr: 'Lait', nameEn: 'Milk', nameAr: 'الحليب',
    required: false, min: 0, max: 1,
    opts: [
      { fr: 'Lait de vache',   en: 'Whole milk',   ar: 'حليب بقري',  delta: 0  },
      { fr: 'Lait végétal',    en: 'Oat milk',     ar: 'حليب الشوفان', delta: 5 },
      { fr: 'Lait d\'amande',  en: 'Almond milk',  ar: 'حليب اللوز', delta: 5  },
    ],
  }

  const SMOOTHIE_SIZE: OG = {
    nameFr: 'Taille', nameEn: 'Size', nameAr: 'الحجم',
    required: true, min: 1, max: 1,
    opts: [
      { fr: '300ml',  en: '300ml',  ar: '300 مل',   delta: 0  },
      { fr: '500ml',  en: '500ml',  ar: '500 مل',   delta: 8  },
    ],
  }

  // ── Products ──────────────────────────────────────────────────────────────
  type ProductDef = {
    cat: string
    fr: string; en: string; ar: string
    descFr: string
    price: number
    prepTime: number
    calories?: number
    groups?: OG[]
  }

  const products: ProductDef[] = [
    // ── BRUNCH ──────────────────────────────────────────────────────────────
    {
      cat: 'brunch', fr: 'Big Brunch', en: 'Big Brunch', ar: 'بيغ برانش',
      descFr: 'Œufs brouillés, bacon, saucisse, toasts, tomates grillées, haricots et jus d\'orange.',
      price: 75, prepTime: 20, calories: 850,
      groups: [
        { nameFr: 'Cuisson des œufs', nameEn: 'Egg style', nameAr: 'طريقة الطهي',
          required: true, min: 1, max: 1,
          opts: [
            { fr: 'Brouillés',  en: 'Scrambled', ar: 'مخفوق',    delta: 0 },
            { fr: 'Au plat',    en: 'Fried',     ar: 'مقلي',     delta: 0 },
            { fr: 'Pochés',     en: 'Poached',   ar: 'مسلوق ناعم', delta: 0 },
          ] },
        { nameFr: 'Extras', nameEn: 'Add-ons', nameAr: 'إضافات', required: false, min: 0, max: 3,
          opts: [
            { fr: 'Avocat',          en: 'Avocado',      ar: 'أفوكادو',      delta: 12 },
            { fr: 'Saumon fumé',     en: 'Smoked salmon',ar: 'سلمون مدخن',  delta: 20 },
            { fr: 'Fromage de chèvre', en: 'Goat cheese', ar: 'جبن الماعز', delta: 10 },
          ] },
      ],
    },
    {
      cat: 'brunch', fr: 'Eggs Benedict', en: 'Eggs Benedict', ar: 'بيض بنيديكت',
      descFr: 'Muffin anglais grillé, jambon, œufs pochés, sauce hollandaise.',
      price: 65, prepTime: 18, calories: 680,
      groups: [
        { nameFr: 'Base', nameEn: 'Base', nameAr: 'القاعدة', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Jambon',        en: 'Ham',          ar: 'جامبون',      delta: 0  },
            { fr: 'Saumon fumé',   en: 'Smoked salmon',ar: 'سلمون مدخن', delta: 15 },
            { fr: 'Épinards',      en: 'Spinach',      ar: 'سبانخ',      delta: 0  },
          ] },
      ],
    },
    {
      cat: 'brunch', fr: 'Pancakes Stack', en: 'Pancake Stack', ar: 'بانكيك',
      descFr: 'Tour de 3 pancakes moelleux, sirop d\'érable, beurre, fruits frais.',
      price: 55, prepTime: 15, calories: 720,
      groups: [
        { nameFr: 'Garniture', nameEn: 'Topping', nameAr: 'الإضافة', required: false, min: 0, max: 2,
          opts: [
            { fr: 'Myrtilles',     en: 'Blueberries',  ar: 'توت أزرق',   delta: 8  },
            { fr: 'Fraises',       en: 'Strawberries', ar: 'فراولة',     delta: 8  },
            { fr: 'Banane',        en: 'Banana',       ar: 'موز',        delta: 5  },
            { fr: 'Nutella',       en: 'Nutella',      ar: 'نوتيلا',     delta: 10 },
            { fr: 'Caramel salé',  en: 'Salted caramel',ar: 'كراميل مالح', delta: 8 },
          ] },
      ],
    },
    {
      cat: 'brunch', fr: 'Avocado Toast', en: 'Avocado Toast', ar: 'توست الأفوكادو',
      descFr: 'Pain sourdough grillé, avocat écrasé, œuf poché, graines de sésame, piment d\'Espelette.',
      price: 55, prepTime: 12, calories: 490,
      groups: [
        { nameFr: 'Extras', nameEn: 'Add-ons', nameAr: 'إضافات', required: false, min: 0, max: 2,
          opts: [
            { fr: 'Saumon fumé',   en: 'Smoked salmon', ar: 'سلمون مدخن', delta: 18 },
            { fr: 'Œuf poché',     en: 'Poached egg',   ar: 'بيضة مسلوقة', delta: 8 },
            { fr: 'Feta',          en: 'Feta cheese',   ar: 'جبن فيتا',   delta: 8  },
          ] },
      ],
    },
    {
      cat: 'brunch', fr: 'French Toast', en: 'French Toast', ar: 'فرنش توست',
      descFr: 'Brioche trempée dans œufs et lait, caramélisée, servie avec sirop d\'érable et fruits.',
      price: 50, prepTime: 15, calories: 650,
    },
    {
      cat: 'brunch', fr: 'Açaï Bowl', en: 'Açaï Bowl', ar: 'بول أساي',
      descFr: 'Base açaï, granola, banane, fraises, myrtilles, noix de coco, miel.',
      price: 65, prepTime: 8, calories: 420,
    },

    // ── BREAKFAST ────────────────────────────────────────────────────────────
    {
      cat: 'breakfast', fr: 'Omelette Tasty', en: 'Tasty Omelette', ar: 'أوملط تيستي',
      descFr: 'Omelette 3 œufs, champignons, poivrons, cheddar. Servie avec pain grillé.',
      price: 42, prepTime: 12, calories: 480,
      groups: [
        { nameFr: 'Garniture', nameEn: 'Filling', nameAr: 'الحشوة', required: false, min: 0, max: 3,
          opts: [
            { fr: 'Jambon',      en: 'Ham',        ar: 'جامبون',    delta: 8  },
            { fr: 'Chorizo',     en: 'Chorizo',    ar: 'شوريثو',    delta: 10 },
            { fr: 'Feta',        en: 'Feta',       ar: 'فيتا',      delta: 8  },
            { fr: 'Épinards',    en: 'Spinach',    ar: 'سبانخ',     delta: 5  },
            { fr: 'Champignons', en: 'Mushrooms',  ar: 'فطر',       delta: 5  },
          ] },
      ],
    },
    {
      cat: 'breakfast', fr: 'Croissant Beurre', en: 'Butter Croissant', ar: 'كرواسون بالزبدة',
      descFr: 'Croissant artisanal, beurre et confiture maison.',
      price: 18, prepTime: 5, calories: 280,
    },
    {
      cat: 'breakfast', fr: 'Croissant Amande', en: 'Almond Croissant', ar: 'كرواسون باللوز',
      descFr: 'Croissant fourré crème d\'amande, amandes effilées, sucre glace.',
      price: 25, prepTime: 5, calories: 420,
    },
    {
      cat: 'breakfast', fr: 'Bowl Granola', en: 'Granola Bowl', ar: 'بول غرانولا',
      descFr: 'Granola maison, yaourt grec, miel, fruits frais de saison.',
      price: 45, prepTime: 5, calories: 380,
    },
    {
      cat: 'breakfast', fr: 'Toast Fromage & Œufs', en: 'Cheese & Egg Toast', ar: 'توست جبن وبيض',
      descFr: 'Pain de mie grillé, œufs brouillés, fromage fondu.',
      price: 35, prepTime: 10, calories: 490,
      groups: [
        { nameFr: 'Cuisson', nameEn: 'Egg style', nameAr: 'طريقة الطهي', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Brouillés', en: 'Scrambled', ar: 'مخفوق', delta: 0 },
            { fr: 'Au plat',   en: 'Fried',     ar: 'مقلي',  delta: 0 },
          ] },
      ],
    },
    {
      cat: 'breakfast', fr: 'Formule Breakfast', en: 'Breakfast Combo', ar: 'وجبة الإفطار',
      descFr: 'Jus d\'orange, café ou thé, croissant beurre, œufs au choix.',
      price: 65, prepTime: 15, calories: 620,
      groups: [
        { nameFr: 'Boisson chaude', nameEn: 'Hot drink', nameAr: 'المشروب الساخن', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Café',     en: 'Coffee', ar: 'قهوة', delta: 0 },
            { fr: 'Thé',      en: 'Tea',    ar: 'شاي',  delta: 0 },
            { fr: 'Cappuccino', en: 'Cappuccino', ar: 'كابتشينو', delta: 5 },
          ] },
        { nameFr: 'Cuisson des œufs', nameEn: 'Egg style', nameAr: 'طريقة الطهي', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Brouillés', en: 'Scrambled', ar: 'مخفوق', delta: 0 },
            { fr: 'Au plat',   en: 'Fried',     ar: 'مقلي',  delta: 0 },
          ] },
      ],
    },

    // ── BURGERS ──────────────────────────────────────────────────────────────
    {
      cat: 'burgers', fr: 'Tasty Classic', en: 'Tasty Classic', ar: 'تيستي كلاسيك',
      descFr: 'Steak haché, salade, tomate, oignon, cornichons, sauce maison. Servi avec frites.',
      price: 55, prepTime: 18, calories: 720,
      groups: BURGER_GROUPS,
    },
    {
      cat: 'burgers', fr: 'Tasty Smash', en: 'Tasty Smash', ar: 'تيستي سماش',
      descFr: 'Double smash burger, cheddar fondu, oignons caramélisés, sauce smash. Avec frites.',
      price: 75, prepTime: 20, calories: 950,
      groups: [
        { nameFr: 'Fromage', nameEn: 'Cheese', nameAr: 'الجبن', required: true, min: 1, max: 1, opts: CHEESE_OPTS },
        { nameFr: 'Sauces',  nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 2, opts: SAUCE_OPTS },
        { nameFr: 'Extras',  nameEn: 'Extras', nameAr: 'إضافات', required: false, min: 0, max: 3, opts: EXTRAS_OPTS },
      ],
    },
    {
      cat: 'burgers', fr: 'Crispy Chicken Burger', en: 'Crispy Chicken Burger', ar: 'برغر دجاج مقرمش',
      descFr: 'Filet de poulet croustillant, salade coleslaw, cornichons, sauce ranch. Avec frites.',
      price: 58, prepTime: 18, calories: 780,
      groups: [
        { nameFr: 'Pain', nameEn: 'Bread', nameAr: 'الخبز', required: true, min: 1, max: 1, opts: BREAD_OPTS },
        { nameFr: 'Sauces', nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 2, opts: SAUCE_OPTS },
        { nameFr: 'Extras', nameEn: 'Extras', nameAr: 'إضافات', required: false, min: 0, max: 3, opts: EXTRAS_OPTS },
      ],
    },
    {
      cat: 'burgers', fr: 'BBQ Bacon Burger', en: 'BBQ Bacon Burger', ar: 'برغر BBQ بيكون',
      descFr: 'Steak bœuf, bacon croustillant, oignons caramélisés, cheddar, sauce BBQ. Avec frites.',
      price: 68, prepTime: 20, calories: 890,
      groups: [
        { nameFr: 'Pain', nameEn: 'Bread', nameAr: 'الخبز', required: true, min: 1, max: 1, opts: BREAD_OPTS },
        { nameFr: 'Sauces', nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 2, opts: SAUCE_OPTS },
        { nameFr: 'Extras', nameEn: 'Extras', nameAr: 'إضافات', required: false, min: 0, max: 3, opts: EXTRAS_OPTS },
      ],
    },
    {
      cat: 'burgers', fr: 'Mushroom Swiss Burger', en: 'Mushroom Swiss Burger', ar: 'برغر مشروم سويسري',
      descFr: 'Steak bœuf, champignons sautés, fromage swiss, mayonnaise à la truffe. Avec frites.',
      price: 70, prepTime: 20, calories: 820,
      groups: [
        { nameFr: 'Pain', nameEn: 'Bread', nameAr: 'الخبز', required: true, min: 1, max: 1, opts: BREAD_OPTS },
        { nameFr: 'Extras', nameEn: 'Extras', nameAr: 'إضافات', required: false, min: 0, max: 3, opts: EXTRAS_OPTS },
      ],
    },
    {
      cat: 'burgers', fr: 'Veggie Burger', en: 'Veggie Burger', ar: 'برغر نباتي',
      descFr: 'Galette de légumes maison, avocat, salade, tomate, sauce yaourt herbes. Avec frites.',
      price: 52, prepTime: 18, calories: 560,
      groups: [
        { nameFr: 'Pain', nameEn: 'Bread', nameAr: 'الخبز', required: true, min: 1, max: 1,
          opts: [
            ...BREAD_OPTS,
            { fr: 'Wrap Intégral', en: 'Whole wheat wrap', ar: 'راب من القمح الكامل', delta: 0 },
          ] },
        { nameFr: 'Fromage', nameEn: 'Cheese', nameAr: 'الجبن', required: false, min: 0, max: 1,
          opts: [
            ...CHEESE_OPTS,
            { fr: 'Sans fromage', en: 'No cheese', ar: 'بدون جبن', delta: 0 },
          ] },
      ],
    },
    {
      cat: 'burgers', fr: 'Double Smash Tasty', en: 'Double Smash Tasty', ar: 'دبل سماش تيستي',
      descFr: 'Deux steaks smashés, double cheddar, bacon, oignons grillés, sauce secrète. Avec frites.',
      price: 85, prepTime: 22, calories: 1100,
      groups: BURGER_GROUPS,
    },

    // ── SANDWICHES ───────────────────────────────────────────────────────────
    {
      cat: 'sandwiches', fr: 'Sandwich Turkish', en: 'Turkish Sandwich', ar: 'ساندويش تركي',
      descFr: 'Émincé de poulet à l\'assaisonnement turc, oignons, tomate, salade, fromage. Avec frites.',
      price: 38, prepTime: 15,
      groups: SANDWICH_GROUPS,
    },
    {
      cat: 'sandwiches', fr: 'Sandwich Kebab', en: 'Kebab Sandwich', ar: 'ساندويش كباب',
      descFr: 'Émincé de poulet sauce kebab, oignons, tomate, salade, coriandre, fromage. Avec frites.',
      price: 42, prepTime: 15,
      groups: SANDWICH_GROUPS,
    },
    {
      cat: 'sandwiches', fr: 'Sandwich American', en: 'American Sandwich', ar: 'ساندويش أمريكي',
      descFr: 'Émincé de bœuf BBQ, onion rings, salade, tomate, fromage. Avec frites.',
      price: 45, prepTime: 15,
      groups: SANDWICH_GROUPS,
    },
    {
      cat: 'sandwiches', fr: 'Sandwich Mixte', en: 'Mixed Sandwich', ar: 'ساندويش مشكل',
      descFr: 'Bœuf et poulet, oignons, tomate, salade, cornichons, fromage. Avec frites.',
      price: 48, prepTime: 15,
      groups: SANDWICH_GROUPS,
    },
    {
      cat: 'sandwiches', fr: 'Sandwich Club', en: 'Club Sandwich', ar: 'كلوب ساندويش',
      descFr: 'Triple pain de mie, poulet grillé, bacon, œuf, tomate, salade, mayo. Avec frites.',
      price: 52, prepTime: 18,
      groups: [
        { nameFr: 'Pain', nameEn: 'Bread', nameAr: 'الخبز', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Pain de mie blanc',    en: 'White bread',      ar: 'خبز أبيض',        delta: 0 },
            { fr: 'Pain de mie complet',  en: 'Wholemeal bread',  ar: 'خبز كامل الحبوب', delta: 0 },
          ] },
        { nameFr: 'Extras', nameEn: 'Extras', nameAr: 'إضافات', required: false, min: 0, max: 2, opts: EXTRAS_OPTS },
      ],
    },
    {
      cat: 'sandwiches', fr: 'Panini Poulet Pesto', en: 'Chicken Pesto Panini', ar: 'بانيني دجاج بيستو',
      descFr: 'Panini grillé, filet de poulet mariné, pesto basilic, mozzarella, tomates séchées.',
      price: 45, prepTime: 12,
      groups: SANDWICH_GROUPS,
    },

    // ── TACOS ────────────────────────────────────────────────────────────────
    {
      cat: 'tacos', fr: 'Tacos Simple', en: 'Simple Tacos', ar: 'تاكوس بسيط',
      descFr: 'Galette de blé, viande au choix, frites, fromage fondu, sauce. Avec boisson.',
      price: 30, prepTime: 15,
      groups: TACO_GROUPS,
    },
    {
      cat: 'tacos', fr: 'Tacos Géant', en: 'Giant Tacos', ar: 'تاكوس جيغانتيك',
      descFr: 'Grande galette, double viande, frites maxi, fromage fondu, deux sauces. Avec boisson.',
      price: 50, prepTime: 18,
      groups: TACO_GROUPS,
    },
    {
      cat: 'tacos', fr: 'Tacos Supreme', en: 'Supreme Tacos', ar: 'تاكوس سوبريم',
      descFr: 'Galette XXL, triple viande, frites, deux fromages, trois sauces. Avec boisson.',
      price: 65, prepTime: 20,
      groups: [
        { nameFr: 'Viande 1', nameEn: 'Meat 1', nameAr: 'اللحم الأول', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Poulet',        en: 'Chicken',      ar: 'دجاج',        delta: 0 },
            { fr: 'Viande Hachée', en: 'Ground Beef',  ar: 'لحم مفروم',   delta: 0 },
            { fr: 'Tenders',       en: 'Tenders',      ar: 'تندرز',       delta: 0 },
          ] },
        { nameFr: 'Viande 2', nameEn: 'Meat 2', nameAr: 'اللحم الثاني', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Poulet',        en: 'Chicken',      ar: 'دجاج',        delta: 0 },
            { fr: 'Viande Hachée', en: 'Ground Beef',  ar: 'لحم مفروم',   delta: 0 },
            { fr: 'Nuggets',       en: 'Nuggets',      ar: 'نغتس',        delta: 0 },
          ] },
        { nameFr: 'Fromages', nameEn: 'Cheeses', nameAr: 'الجبن', required: false, min: 0, max: 2, opts: CHEESE_OPTS },
        { nameFr: 'Sauces', nameEn: 'Sauces', nameAr: 'الصوصات', required: false, min: 0, max: 3, opts: SAUCE_OPTS },
      ],
    },

    // ── POUTINES ─────────────────────────────────────────────────────────────
    {
      cat: 'poutines', fr: 'Poutine Classique', en: 'Classic Poutine', ar: 'بوتين كلاسيك',
      descFr: 'Frites dorées, fromage en grains fondant, sauce brune maison.',
      price: 22, prepTime: 10, calories: 680,
    },
    {
      cat: 'poutines', fr: 'Poutine Viande Hachée', en: 'Ground Beef Poutine', ar: 'بوتين لحم مفروم',
      descFr: 'Frites, fromage en grains, sauce et viande hachée assaisonnée.',
      price: 32, prepTime: 12, calories: 820,
      groups: [
        { nameFr: 'Extras', nameEn: 'Add-ons', nameAr: 'إضافات', required: false, min: 0, max: 2,
          opts: [
            { fr: 'Oignons caramélisés', en: 'Caramelized onions', ar: 'بصل مكرمل', delta: 5  },
            { fr: 'Jalapeños',            en: 'Jalapeños',          ar: 'هالابينو',  delta: 5  },
            { fr: 'Extra fromage',        en: 'Extra cheese',       ar: 'جبن إضافي', delta: 7 },
          ] },
      ],
    },
    {
      cat: 'poutines', fr: 'Poutine Dinde ou Poulet', en: 'Turkey or Chicken Poutine', ar: 'بوتين ديك رومي أو دجاج',
      descFr: 'Frites, fromage en grains, sauce et dinde fumée ou poulet grillé.',
      price: 32, prepTime: 12, calories: 780,
      groups: [
        { nameFr: 'Viande', nameEn: 'Meat', nameAr: 'اللحم', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Dinde fumée', en: 'Smoked turkey', ar: 'ديك رومي مدخن', delta: 0 },
            { fr: 'Poulet',      en: 'Chicken',       ar: 'دجاج',           delta: 0 },
          ] },
      ],
    },
    {
      cat: 'poutines', fr: 'Poutine Chicken Fingers', en: 'Chicken Fingers Poutine', ar: 'بوتين أصابع الدجاج',
      descFr: 'Frites, fromage en grains fondant, sauce et chicken fingers croustillants.',
      price: 35, prepTime: 12, calories: 850,
    },
    {
      cat: 'poutines', fr: 'Poutine Tasty Deluxe', en: 'Tasty Deluxe Poutine', ar: 'بوتين تيستي ديلوكس',
      descFr: 'Frites, fromage en grains, sauce, viande hachée, bacon croustillant, oignons caramélisés.',
      price: 45, prepTime: 15, calories: 1050,
    },

    // ── SALADES ──────────────────────────────────────────────────────────────
    {
      cat: 'salades', fr: 'Salade César', en: 'Caesar Salad', ar: 'سلطة سيزر',
      descFr: 'Romaine, croûtons, parmesan, sauce César maison.',
      price: 45, prepTime: 10, calories: 380,
      groups: [
        { nameFr: 'Protéine', nameEn: 'Protein', nameAr: 'البروتين', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Poulet grillé', en: 'Grilled chicken', ar: 'دجاج مشوي', delta: 15 },
            { fr: 'Crevettes',     en: 'Shrimps',         ar: 'روبيان',    delta: 20 },
            { fr: 'Saumon',        en: 'Salmon',          ar: 'سلمون',     delta: 22 },
          ] },
      ],
    },
    {
      cat: 'salades', fr: 'Salade Grecque', en: 'Greek Salad', ar: 'سلطة يونانية',
      descFr: 'Tomates, concombre, olives, feta, poivrons, origan, vinaigrette.',
      price: 42, prepTime: 8, calories: 290,
    },
    {
      cat: 'salades', fr: 'Salade Bowl Quinoa', en: 'Quinoa Bowl Salad', ar: 'سلطة كينوا بول',
      descFr: 'Quinoa, avocat, tomates cerises, maïs, coriandre, citron, huile d\'olive.',
      price: 52, prepTime: 10, calories: 420,
      groups: [
        { nameFr: 'Protéine', nameEn: 'Protein', nameAr: 'البروتين', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Poulet grillé', en: 'Grilled chicken', ar: 'دجاج مشوي', delta: 15 },
            { fr: 'Thon',          en: 'Tuna',            ar: 'تونة',       delta: 12 },
            { fr: 'Tofu',          en: 'Tofu',            ar: 'توفو',       delta: 10 },
          ] },
      ],
    },
    {
      cat: 'salades', fr: 'Salade Marocaine', en: 'Moroccan Salad', ar: 'سلطة مغربية',
      descFr: 'Tomates, oignons, poivrons, persil, coriandre, citron, huile d\'argan.',
      price: 35, prepTime: 8, calories: 180,
    },
    {
      cat: 'salades', fr: 'Salade Poulet Mangue', en: 'Chicken Mango Salad', ar: 'سلطة دجاج وجبن',
      descFr: 'Poulet grillé, mangue fraîche, avocat, roquette, vinaigrette passion.',
      price: 58, prepTime: 12, calories: 390,
    },

    // ── JUS FRAIS ────────────────────────────────────────────────────────────
    {
      cat: 'jus-frais', fr: 'Jus d\'Orange', en: 'Orange Juice', ar: 'عصير البرتقال',
      descFr: 'Oranges fraîchement pressées. 100% naturel, sans sucre ajouté.',
      price: 22, prepTime: 5, calories: 110,
      groups: [{ ...SMOOTHIE_SIZE, nameFr: 'Taille', nameEn: 'Size', nameAr: 'الحجم' }],
    },
    {
      cat: 'jus-frais', fr: 'Jus de Carotte Gingembre', en: 'Carrot Ginger Juice', ar: 'عصير الجزر والزنجبيل',
      descFr: 'Carottes fraîches, gingembre, citron. Boost d\'énergie naturel.',
      price: 25, prepTime: 5, calories: 95,
      groups: [{ ...SMOOTHIE_SIZE }],
    },
    {
      cat: 'jus-frais', fr: 'Jus de Grenade', en: 'Pomegranate Juice', ar: 'عصير الرمان',
      descFr: 'Grenades fraîches pressées, riche en antioxydants.',
      price: 30, prepTime: 5, calories: 130,
      groups: [{ ...SMOOTHIE_SIZE }],
    },
    {
      cat: 'jus-frais', fr: 'Jus Détox Vert', en: 'Green Detox Juice', ar: 'عصير ديتوكس أخضر',
      descFr: 'Épinards, concombre, pomme verte, céleri, citron, gingembre.',
      price: 32, prepTime: 5, calories: 85,
      groups: [{ ...SMOOTHIE_SIZE }],
    },
    {
      cat: 'jus-frais', fr: 'Jus de Pastèque Menthe', en: 'Watermelon Mint Juice', ar: 'عصير البطيخ بالنعناع',
      descFr: 'Pastèque fraîche, menthe, citron. Rafraîchissant et léger.',
      price: 25, prepTime: 5, calories: 90,
      groups: [{ ...SMOOTHIE_SIZE }],
    },
    {
      cat: 'jus-frais', fr: 'Jus de Mangue', en: 'Mango Juice', ar: 'عصير المانجو',
      descFr: 'Mangues fraîches mixées, touche de citron.',
      price: 28, prepTime: 5, calories: 140,
      groups: [{ ...SMOOTHIE_SIZE }],
    },

    // ── SMOOTHIES ────────────────────────────────────────────────────────────
    {
      cat: 'smoothies', fr: 'Smoothie Tropical', en: 'Tropical Smoothie', ar: 'سموثي استوائي',
      descFr: 'Mangue, ananas, banane, lait de coco, curcuma.',
      price: 38, prepTime: 5, calories: 280,
      groups: [{ ...SMOOTHIE_SIZE }, { ...MILK_OPT }],
    },
    {
      cat: 'smoothies', fr: 'Smoothie Fraise Banane', en: 'Strawberry Banana Smoothie', ar: 'سموثي فراولة موز',
      descFr: 'Fraises, banane, yaourt grec, miel, vanille.',
      price: 35, prepTime: 5, calories: 320,
      groups: [{ ...SMOOTHIE_SIZE }, { ...MILK_OPT }],
    },
    {
      cat: 'smoothies', fr: 'Smoothie Myrtille Acaï', en: 'Blueberry Açaï Smoothie', ar: 'سموثي توت أزرق وأساي',
      descFr: 'Myrtilles, açaï, lait d\'amande, graines de chia, miel.',
      price: 42, prepTime: 5, calories: 260,
      groups: [{ ...SMOOTHIE_SIZE }],
    },
    {
      cat: 'smoothies', fr: 'Smoothie Protéiné', en: 'Protein Smoothie', ar: 'سموثي بروتين',
      descFr: 'Banane, beurre de cacahuète, protéine vanille, lait, avoine.',
      price: 45, prepTime: 5, calories: 480,
      groups: [
        { ...SMOOTHIE_SIZE },
        { nameFr: 'Protéine', nameEn: 'Protein', nameAr: 'البروتين', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Vanille',   en: 'Vanilla',   ar: 'فانيلا',   delta: 0 },
            { fr: 'Chocolat',  en: 'Chocolate', ar: 'شوكولا',   delta: 0 },
            { fr: 'Fraise',    en: 'Strawberry',ar: 'فراولة',   delta: 0 },
          ] },
      ],
    },
    {
      cat: 'smoothies', fr: 'Green Smoothie', en: 'Green Smoothie', ar: 'سموثي أخضر',
      descFr: 'Épinards, banane, pomme verte, concombre, citron, gingembre.',
      price: 38, prepTime: 5, calories: 190,
      groups: [{ ...SMOOTHIE_SIZE }],
    },

    // ── CAFÉ ─────────────────────────────────────────────────────────────────
    {
      cat: 'cafe', fr: 'Espresso', en: 'Espresso', ar: 'إسبريسو',
      descFr: 'Espresso simple ou double, 100% arabica.',
      price: 15, prepTime: 3, calories: 5,
      groups: [
        { nameFr: 'Dose', nameEn: 'Shot', nameAr: 'الجرعة', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Simple',  en: 'Single', ar: 'عادي',  delta: 0 },
            { fr: 'Double',  en: 'Double', ar: 'مضاعف', delta: 5 },
          ] },
      ],
    },
    {
      cat: 'cafe', fr: 'Cappuccino', en: 'Cappuccino', ar: 'كابتشينو',
      descFr: 'Espresso, mousse de lait onctueuse, cacao saupoudré.',
      price: 28, prepTime: 5, calories: 120,
      groups: [{ ...COFFEE_SIZE }, { ...MILK_OPT }],
    },
    {
      cat: 'cafe', fr: 'Latte', en: 'Latte', ar: 'لاتيه',
      descFr: 'Espresso, lait chaud velouté, légère mousse.',
      price: 30, prepTime: 5, calories: 150,
      groups: [
        { ...COFFEE_SIZE },
        { ...MILK_OPT },
        { nameFr: 'Sirop', nameEn: 'Syrup', nameAr: 'الشراب', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Vanille',       en: 'Vanilla',       ar: 'فانيلا',      delta: 5 },
            { fr: 'Caramel',       en: 'Caramel',       ar: 'كراميل',      delta: 5 },
            { fr: 'Noisette',      en: 'Hazelnut',      ar: 'بندق',        delta: 5 },
            { fr: 'Lavande',       en: 'Lavender',      ar: 'لافندر',      delta: 5 },
          ] },
      ],
    },
    {
      cat: 'cafe', fr: 'Flat White', en: 'Flat White', ar: 'فلات وايت',
      descFr: 'Double ristretto, micro-mousse de lait texturé.',
      price: 32, prepTime: 5, calories: 100,
      groups: [{ ...MILK_OPT }],
    },
    {
      cat: 'cafe', fr: 'Iced Latte', en: 'Iced Latte', ar: 'آيس لاتيه',
      descFr: 'Espresso, lait froid, glaçons. Rafraîchissant et gourmand.',
      price: 32, prepTime: 5, calories: 130,
      groups: [
        { ...MILK_OPT },
        { nameFr: 'Sirop', nameEn: 'Syrup', nameAr: 'الشراب', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Vanille',  en: 'Vanilla', ar: 'فانيلا', delta: 5 },
            { fr: 'Caramel',  en: 'Caramel', ar: 'كراميل', delta: 5 },
          ] },
      ],
    },
    {
      cat: 'cafe', fr: 'Matcha Latte', en: 'Matcha Latte', ar: 'ماتشا لاتيه',
      descFr: 'Poudre de matcha japonais, lait chaud ou froid, miel.',
      price: 35, prepTime: 5, calories: 160,
      groups: [
        { nameFr: 'Température', nameEn: 'Temperature', nameAr: 'درجة الحرارة', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Chaud',  en: 'Hot',  ar: 'ساخن', delta: 0 },
            { fr: 'Glacé',  en: 'Iced', ar: 'بارد',  delta: 0 },
          ] },
        { ...MILK_OPT },
      ],
    },
    {
      cat: 'cafe', fr: 'Americano', en: 'Americano', ar: 'أمريكانو',
      descFr: 'Espresso allongé à l\'eau chaude.',
      price: 22, prepTime: 3, calories: 10,
      groups: [{ ...COFFEE_SIZE }],
    },
    {
      cat: 'cafe', fr: 'Thé à la Menthe', en: 'Mint Tea', ar: 'شاي بالنعناع',
      descFr: 'Thé vert marocain à la menthe fraîche, servi en théière.',
      price: 18, prepTime: 5, calories: 30,
    },

    // ── DESSERTS ─────────────────────────────────────────────────────────────
    {
      cat: 'desserts', fr: 'Cheesecake New York', en: 'New York Cheesecake', ar: 'تشيزكيك نيويورك',
      descFr: 'Cheesecake crémeux sur base biscuitée, coulis de fruits rouges.',
      price: 42, prepTime: 5, calories: 520,
      groups: [
        { nameFr: 'Coulis', nameEn: 'Topping', nameAr: 'الصوص', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Fruits rouges', en: 'Mixed berries', ar: 'فواكه حمراء', delta: 0 },
            { fr: 'Caramel',       en: 'Caramel',       ar: 'كراميل',      delta: 0 },
            { fr: 'Chocolat',      en: 'Chocolate',     ar: 'شوكولا',      delta: 0 },
          ] },
      ],
    },
    {
      cat: 'desserts', fr: 'Lava Cake Chocolat', en: 'Chocolate Lava Cake', ar: 'كيكة لافا شوكولا',
      descFr: 'Fondant au chocolat noir cœur coulant, glace vanille.',
      price: 45, prepTime: 12, calories: 580,
      groups: [
        { nameFr: 'Accompagnement', nameEn: 'Side', nameAr: 'المرافق', required: false, min: 0, max: 1,
          opts: [
            { fr: 'Glace vanille',   en: 'Vanilla ice cream', ar: 'آيس كريم فانيلا', delta: 0  },
            { fr: 'Glace caramel',   en: 'Caramel ice cream', ar: 'آيس كريم كراميل', delta: 0  },
            { fr: 'Crème chantilly', en: 'Whipped cream',     ar: 'كريمة مخفوقة',   delta: 0  },
          ] },
      ],
    },
    {
      cat: 'desserts', fr: 'Tiramisu', en: 'Tiramisu', ar: 'تيراميسو',
      descFr: 'Mascarpone, biscuits imbibés de café, cacao amer.',
      price: 38, prepTime: 5, calories: 460,
    },
    {
      cat: 'desserts', fr: 'Crème Brûlée', en: 'Crème Brûlée', ar: 'كريم بروليه',
      descFr: 'Crème vanille, caramel croustillant flambé.',
      price: 38, prepTime: 5, calories: 380,
    },
    {
      cat: 'desserts', fr: 'Brownies & Glace', en: 'Brownie & Ice Cream', ar: 'براوني وآيس كريم',
      descFr: 'Brownie chaud au chocolat, noix de pécan, glace vanille, coulis chocolat.',
      price: 40, prepTime: 8, calories: 620,
    },
    {
      cat: 'desserts', fr: 'Waffles', en: 'Waffles', ar: 'وافل',
      descFr: 'Gaufres croustillantes, garnitures au choix.',
      price: 42, prepTime: 10, calories: 540,
      groups: [
        { nameFr: 'Garniture', nameEn: 'Topping', nameAr: 'الإضافة', required: true, min: 1, max: 3,
          opts: [
            { fr: 'Nutella',       en: 'Nutella',       ar: 'نوتيلا',      delta: 0  },
            { fr: 'Sirop érable',  en: 'Maple syrup',   ar: 'شراب القيقب', delta: 0  },
            { fr: 'Fraises',       en: 'Strawberries',  ar: 'فراولة',      delta: 5  },
            { fr: 'Banane',        en: 'Banana',        ar: 'موز',         delta: 3  },
            { fr: 'Glace vanille', en: 'Vanilla ice',   ar: 'آيس كريم',    delta: 8  },
            { fr: 'Chantilly',     en: 'Whipped cream', ar: 'كريمة',       delta: 5  },
          ] },
      ],
    },
    {
      cat: 'desserts', fr: 'Churros', en: 'Churros', ar: 'تشوروس',
      descFr: 'Churros frits, cannelle, sucre, sauce chocolat ou caramel.',
      price: 32, prepTime: 8, calories: 420,
      groups: [
        { nameFr: 'Sauce', nameEn: 'Dipping sauce', nameAr: 'الصوص', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Chocolat',      en: 'Chocolate',     ar: 'شوكولا',   delta: 0 },
            { fr: 'Caramel salé',  en: 'Salted caramel',ar: 'كراميل',  delta: 0 },
          ] },
      ],
    },

    // ── MENU ENFANTS ─────────────────────────────────────────────────────────
    {
      cat: 'menu-enfants', fr: 'Menu Enfants', en: "Kids Meal", ar: 'وجبة الأطفال',
      descFr: 'Plat principal + Frites + Boisson + Surprise.',
      price: 38, prepTime: 15,
      groups: [
        { nameFr: 'Plat principal', nameEn: 'Main dish', nameAr: 'الطبق الرئيسي', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Mini Burger',  en: 'Mini Burger',  ar: 'ميني برغر',   delta: 0 },
            { fr: 'Pizza',        en: 'Pizza',        ar: 'بيتزا',       delta: 0 },
            { fr: 'Nuggets x6',   en: 'Nuggets x6',   ar: '6 نغتس',      delta: 0 },
            { fr: 'Hot Dog',      en: 'Hot Dog',      ar: 'هوت دوج',     delta: 0 },
          ] },
        { nameFr: 'Boisson', nameEn: 'Drink', nameAr: 'المشروب', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Eau',          en: 'Water',        ar: 'ماء',         delta: 0 },
            { fr: 'Jus de pomme', en: 'Apple juice',  ar: 'عصير تفاح',   delta: 0 },
            { fr: 'Lait',         en: 'Milk',         ar: 'حليب',        delta: 0 },
          ] },
      ],
    },

    // ── BOISSONS ─────────────────────────────────────────────────────────────
    {
      cat: 'boissons', fr: 'Soda', en: 'Soda', ar: 'صودا',
      descFr: 'Coca-Cola, Pepsi, Fanta, Sprite.',
      price: 10, prepTime: 2, calories: 140,
      groups: [
        { nameFr: 'Marque', nameEn: 'Brand', nameAr: 'الماركة', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Coca-Cola',  en: 'Coca-Cola',  ar: 'كوكا كولا', delta: 0 },
            { fr: 'Pepsi',      en: 'Pepsi',      ar: 'بيبسي',     delta: 0 },
            { fr: 'Fanta',      en: 'Fanta',      ar: 'فانتا',     delta: 0 },
            { fr: 'Sprite',     en: 'Sprite',     ar: 'سبرايت',    delta: 0 },
          ] },
      ],
    },
    {
      cat: 'boissons', fr: 'Eau Minérale', en: 'Mineral Water', ar: 'ماء معدني',
      descFr: 'Eau Sidi Ali ou Ain Saïss.',
      price: 7, prepTime: 1,
    },
    {
      cat: 'boissons', fr: 'Eau Gazeuse', en: 'Sparkling Water', ar: 'ماء غازي',
      descFr: 'Eau minérale gazeuse.',
      price: 12, prepTime: 1,
    },
    {
      cat: 'boissons', fr: 'Milkshake', en: 'Milkshake', ar: 'ميلك شيك',
      descFr: 'Milkshake onctueux, parfum au choix.',
      price: 38, prepTime: 8, calories: 480,
      groups: [
        { nameFr: 'Parfum', nameEn: 'Flavor', nameAr: 'النكهة', required: true, min: 1, max: 1,
          opts: [
            { fr: 'Vanille',    en: 'Vanilla',    ar: 'فانيلا',    delta: 0 },
            { fr: 'Chocolat',   en: 'Chocolate',  ar: 'شوكولا',    delta: 0 },
            { fr: 'Fraise',     en: 'Strawberry', ar: 'فراولة',    delta: 0 },
            { fr: 'Caramel',    en: 'Caramel',    ar: 'كراميل',    delta: 0 },
            { fr: 'Oreo',       en: 'Oreo',       ar: 'أوريو',     delta: 5 },
          ] },
      ],
    },
  ]

  // ── Insert all products + option groups ───────────────────────────────────
  let prodCount = 0, groupCount = 0, optCount = 0

  for (let si = 0; si < products.length; si++) {
    const p = products[si]!
    const catId = catIds[p.cat]
    if (!catId) { console.warn(`⚠ Unknown category: ${p.cat}`); continue }

    const [prod] = await sql`
      INSERT INTO tastytime.products (
        category_id, name_fr, name_en, name_ar,
        description_fr, description_en, description_ar,
        base_price, prep_time_minutes, calories, sort_order
      ) VALUES (
        ${catId}, ${p.fr}, ${p.en}, ${p.ar},
        ${p.descFr}, ${p.descFr}, ${p.descFr},
        ${p.price}, ${p.prepTime}, ${p.calories ?? null}, ${si}
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    if (!prod) continue
    prodCount++

    for (let gi = 0; gi < (p.groups ?? []).length; gi++) {
      const g = p.groups![gi]!
      const [grp] = await sql`
        INSERT INTO tastytime.option_groups (
          product_id, name_fr, name_en, name_ar,
          required, min_select, max_select, sort_order
        ) VALUES (
          ${prod.id}, ${g.nameFr}, ${g.nameEn}, ${g.nameAr},
          ${g.required}, ${g.min}, ${g.max}, ${gi}
        ) RETURNING id
      `
      if (!grp) continue
      groupCount++

      for (let oi = 0; oi < g.opts.length; oi++) {
        const o = g.opts[oi]!
        await sql`
          INSERT INTO tastytime.options (
            option_group_id, name_fr, name_en, name_ar, price_delta, sort_order
          ) VALUES (
            ${grp.id}, ${o.fr}, ${o.en}, ${o.ar}, ${o.delta}, ${oi}
          )
        `
        optCount++
      }
    }
  }

  console.log(`✓ Products: ${prodCount}, Option groups: ${groupCount}, Options: ${optCount}`)

  // ── Promo codes ───────────────────────────────────────────────────────────
  await sql`
    INSERT INTO tastytime.promo_codes (code, type, value, min_order_amount, max_uses, is_active)
    VALUES
      ('WELCOME10', 'percentage', 10, 50, NULL, true),
      ('LIVRAISON', 'fixed',      15, 80, 500, true),
      ('TASTY20',   'percentage', 20, 100, 200, true)
    ON CONFLICT (code) DO NOTHING
  `
  console.log('✓ Promo codes seeded')

  console.log('\n🎉 Seed complete! Tasty Time is ready.')
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
