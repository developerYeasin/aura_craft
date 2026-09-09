import bcrypt from 'bcryptjs';
import { pool, query, transaction } from '../config/db.js';
import { env } from '../config/env.js';
import { slugify } from '../utils/slug.js';

const img = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const RING = ['photo-1605100804763-247f67b3557e', 'photo-1611652022419-a9419f74343d', 'photo-1603561591411-07134e71a2a9', 'photo-1602751584552-8ba73aad10e1'];
const BRACELET = ['photo-1611591437281-460bfbe1220a', 'photo-1573408301185-9146fe634ad0', 'photo-1599643478518-a784e5dc4c8f', 'photo-1602173574767-37ac01994b2a'];
const PERFUME = ['photo-1541643600914-78b084683601', 'photo-1592945403244-b3fbafd7f539', 'photo-1594035910387-fea47794261f', 'photo-1587017539504-67cfbddac569'];
const EARRING = ['photo-1611652022419-a9419f74343d', 'photo-1602751584552-8ba73aad10e1', 'photo-1573408301185-9146fe634ad0', 'photo-1603561591411-07134e71a2a9'];
const KEYRING = ['photo-1599643478518-a784e5dc4c8f', 'photo-1602173574767-37ac01994b2a', 'photo-1611591437281-460bfbe1220a', 'photo-1605100804763-247f67b3557e'];

const categories = [
  {
    name: 'Rings', name_bn: 'রিংস', icon: '💍', sort_order: 1,
    description: 'স্টাইলিশ ও এক্সক্লুসিভ রিং কালেকশন',
    image_url: img(RING[0], 600), banner_url: img(RING[1], 1600),
    products: [
      ['রয়্যাল রিং', 1200, 1800, 'প্রিমিয়াম কোয়ালিটি স্টেইনলেস স্টিলের রয়্যাল ডিজাইন রিং', RING, 'স্টেইনলেস স্টিল', 'সিলভার', '6/7/8/9/10', true],
      ['ব্ল্যাক স্টোন রিং', 1660, 2000, 'কালো স্টোন বসানো ইউনিসেক্স রিং', RING, 'টাইটেনিয়াম', 'ব্ল্যাক', '7/8/9/10', true],
      ['ব্ল্যাক কেভ রিং', 2800, null, 'ম্যাট ফিনিশ ব্ল্যাক কেভ টেক্সচার রিং', RING, 'টাংস্টেন', 'ব্ল্যাক', '8/9/10', false],
      ['সিলভার ক্রাউন রিং', 1860, 2400, 'ক্রাউন ডিজাইনের এলিগেন্ট সিলভার রিং', RING, 'সিলভার ৯২৫', 'সিলভার', '6/7/8', true],
      ['গোল্ডেন ডুয়ো রিং', 3200, 3900, 'গোল্ড প্লেটেড ডাবল ব্যান্ড রিং', RING, 'গোল্ড প্লেটেড', 'গোল্ড', '7/8/9', false],
      ['প্রিমিয়াম রিং', 1200, null, 'ডেইলি ইউজের জন্য মিনিমাল প্রিমিয়াম রিং', RING, 'স্টেইনলেস স্টিল', 'রোজ গোল্ড', '6/7/8/9', false],
      ['ক্লাসিক রিং', 2800, 3200, 'ক্লাসিক কাট ডিজাইন স্টোন রিং', RING, 'স্টেইনলেস স্টিল', 'সিলভার', '7/8/9', false],
      ['ওশান ব্লু রিং', 3000, null, 'ব্লু স্টোন বসানো এক্সক্লুসিভ রিং', RING, 'সিলভার ৯২৫', 'ব্লু', '7/8/9', true],
    ],
  },
  {
    name: 'Bracelets', name_bn: 'ব্রেসলেট', icon: '📿', sort_order: 2,
    description: 'আধুনিক ও ক্লাসিক ব্রেসলেট কালেকশন',
    image_url: img(BRACELET[0], 600), banner_url: img(BRACELET[1], 1600),
    products: [
      ['ব্ল্যাক বিডস ব্রেসলেট', 860, 1100, 'ন্যাচারাল ব্ল্যাক বিডস হ্যান্ড ব্রেসলেট', BRACELET, 'ন্যাচারাল স্টোন', 'ব্ল্যাক', 'ফ্রি সাইজ', true],
      ['গোল্ড ব্রেসলেট', 1800, 2300, 'গোল্ড প্লেটেড চেইন ব্রেসলেট', BRACELET, 'গোল্ড প্লেটেড', 'গোল্ড', 'অ্যাডজাস্টেবল', true],
      ['সিলভার ব্রেসলেট', 3600, 4200, 'হেভি সিলভার চেইন ব্রেসলেট', BRACELET, 'সিলভার ৯২৫', 'সিলভার', 'অ্যাডজাস্টেবল', false],
      ['স্টোন ব্রেসলেট', 1900, null, 'মাল্টি কালার স্টোন ব্রেসলেট', BRACELET, 'ন্যাচারাল স্টোন', 'মিক্সড', 'ফ্রি সাইজ', false],
      ['কাপল ব্রেসলেট জোড়া', 3200, 3800, 'কাপলদের জন্য ম্যাচিং ব্রেসলেট সেট', BRACELET, 'স্টেইনলেস স্টিল', 'সিলভার+ব্ল্যাক', 'ফ্রি সাইজ', true],
      ['লেদার ব্রেসলেট', 1100, 1400, 'জেনুইন লেদার ব্যান্ড ব্রেসলেট', BRACELET, 'লেদার', 'ব্রাউন', 'অ্যাডজাস্টেবল', false],
    ],
  },
  {
    name: 'Perfume', name_bn: 'পারফিউম', icon: '🌸', sort_order: 3,
    description: 'আপনার ব্যক্তিত্বে নিখুঁত সুগন্ধ',
    image_url: img(PERFUME[0], 600), banner_url: img(PERFUME[1], 1600),
    products: [
      ['অউদ পারফিউম', 3860, 4500, 'লং লাস্টিং অউদ ফ্রাগরেন্স, ১০০ মি.লি.', PERFUME, 'অউদ এসেন্স', 'ডার্ক অ্যাম্বার', '৫০ml/১০০ml', true],
      ['রোজ পারফিউম', 2400, 2900, 'ফ্রেশ রোজ নোটের ফেমিনিন পারফিউম', PERFUME, 'রোজ এসেন্স', 'পিংক', '৫০ml/১০০ml', true],
      ['মাস্ক পারফিউম', 2100, null, 'সফট মাস্ক বেস ডেইলি পারফিউম', PERFUME, 'মাস্ক', 'হোয়াইট', '৫০ml', false],
      ['অ্যাম্বার পারফিউম', 2700, 3200, 'ওয়ার্ম অ্যাম্বার ও ভ্যানিলা ব্লেন্ড', PERFUME, 'অ্যাম্বার', 'গোল্ডেন', '১০০ml', false],
      ['সিট্রাস পারফিউম', 2000, 2500, 'সিট্রাস ফ্রেশ সামার ফ্রাগরেন্স', PERFUME, 'সিট্রাস', 'গ্রিন', '৫০ml/১০০ml', false],
      ['মিডনাইট পারফিউম', 3600, 4100, 'নাইট আউটের জন্য ইনটেন্স ফ্রাগরেন্স', PERFUME, 'উডি', 'ব্ল্যাক', '১০০ml', true],
    ],
  },
  {
    name: 'Earrings', name_bn: 'কানের দুল', icon: '✨', sort_order: 4,
    description: 'সুন্দর কানের দুলের সংগ্রহ',
    image_url: img(EARRING[0], 600), banner_url: img(EARRING[1], 1600),
    products: [
      ['গোল্ডেন ইয়াররিং', 3600, 4200, 'ঝুমকা স্টাইল গোল্ড প্লেটেড কানের দুল', EARRING, 'গোল্ড প্লেটেড', 'গোল্ড', 'স্ট্যান্ডার্ড', true],
      ['পার্ল ড্রপ ইয়াররিং', 1500, 1900, 'পার্ল ড্রপ এলিগেন্ট কানের দুল', EARRING, 'পার্ল', 'হোয়াইট', 'স্ট্যান্ডার্ড', true],
      ['সিলভার হুপ', 1200, null, 'মিনিমাল সিলভার হুপ ইয়াররিং', EARRING, 'সিলভার ৯২৫', 'সিলভার', 'ছোট/বড়', false],
      ['স্টোন স্টাড', 900, 1200, 'ডেইলি ইউজ স্টোন স্টাড দুল', EARRING, 'স্টেইনলেস স্টিল', 'মিক্সড', 'স্ট্যান্ডার্ড', false],
      ['ট্রাডিশনাল ঝুমকা', 2400, 2900, 'ঐতিহ্যবাহী ডিজাইনের ঝুমকা', EARRING, 'গোল্ড প্লেটেড', 'গোল্ড', 'স্ট্যান্ডার্ড', true],
    ],
  },
  {
    name: 'Keyring', name_bn: 'কী-রিং', icon: '🔑', sort_order: 5,
    description: 'স্টাইলিশ কী-রিং কালেকশন',
    image_url: img(KEYRING[0], 600), banner_url: img(KEYRING[1], 1600),
    products: [
      ['ব্রেসলেট কী-রিং', 660, 850, 'মেটাল বডি প্রিমিয়াম কী-রিং', KEYRING, 'মেটাল', 'সিলভার', 'ফ্রি সাইজ', true],
      ['লেদার কী-রিং', 550, null, 'লেদার স্ট্র্যাপ কী-রিং', KEYRING, 'লেদার', 'ব্রাউন', 'ফ্রি সাইজ', false],
      ['কাস্টম নেম কী-রিং', 850, 1000, 'আপনার নাম খোদাই করা কী-রিং', KEYRING, 'স্টেইনলেস স্টিল', 'সিলভার', 'কাস্টম', true],
      ['কাপল কী-রিং সেট', 1200, 1500, 'কাপলদের জন্য ম্যাচিং কী-রিং সেট', KEYRING, 'মেটাল', 'গোল্ড+সিলভার', 'ফ্রি সাইজ', false],
    ],
  },
];

const team = [
  ['Rahat Hossain', 'Founder & Developer', 'AuraCraft-এর প্রতিষ্ঠাতা ও প্রধান ডেভেলপার।', 'https://i.pravatar.cc/300?img=12'],
  ['Sohana Akter', 'UI/UX Designer', 'ব্র্যান্ডের ভিজ্যুয়াল ও ইউজার এক্সপেরিয়েন্স ডিজাইনার।', 'https://i.pravatar.cc/300?img=45'],
  ['Tanvir Ahmed', 'Marketing Head', 'মার্কেটিং ও গ্রোথ স্ট্র্যাটেজি লিড।', 'https://i.pravatar.cc/300?img=33'],
  ['Nurul Jahan', 'Content Creator', 'প্রোডাক্ট কনটেন্ট ও সোশ্যাল মিডিয়া ম্যানেজার।', 'https://i.pravatar.cc/300?img=47'],
];

const settings = {
  site_name: 'AuraCraft',
  site_tagline: 'Style • Elegance • You',
  hero_title: 'আপনার স্টাইল, আমাদের অনন্যতা',
  hero_subtitle: 'প্রিমিয়াম জুয়েলারি, পারফিউম এবং এক্সক্লুসিভ আতরসামগ্রী এখন এক আঙিনায়।',
  contact_phone: '+880 1XXX-XXXX',
  contact_email: 'support@auracraft.com',
  contact_address: 'Dhaka, Bangladesh',
  facebook_url: 'https://facebook.com',
  instagram_url: 'https://instagram.com',
  youtube_url: 'https://youtube.com',
  twitter_url: 'https://x.com',
  delivery_charge_inside: '60',
  delivery_charge_outside: '120',
  offer_title: 'Special Offer',
  offer_text: 'নির্বাচিত কিছু প্রোডাক্টে পাচ্ছেন বিশেষ ছাড়!',
};

const run = async () => {
  await transaction(async (conn) => {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['notifications', 'push_subscriptions', 'order_items', 'orders', 'product_images', 'products', 'categories', 'team_members', 'settings', 'users']) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const hash = (pw) => bcrypt.hashSync(pw, 10);
    await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES ?', [[
      ['Immortal', 'immortal@auracraft.com', hash('immortal123'), 'immortal'],
      ['Admin', env.admin.email, hash(env.admin.password), 'admin'],
    ]]);

    for (const cat of categories) {
      const [catRes] = await conn.query(
        `INSERT INTO categories (name, name_bn, slug, description, icon, image_url, banner_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cat.name, cat.name_bn, slugify(cat.name), cat.description, cat.icon, cat.image_url, cat.banner_url, cat.sort_order]
      );
      const categoryId = catRes.insertId;

      for (const [i, p] of cat.products.entries()) {
        const [name, price, compare, desc, gallery, material, color, sizes, featured] = p;
        const slug = `${slugify(cat.name)}-${slugify(name)}-${categoryId}${i}`;
        const [prodRes] = await conn.query(
          `INSERT INTO products (category_id, name, slug, sku, short_description, description, price, compare_price,
             stock, material, color, size_options, warranty, rating, rating_count, is_featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId, name, slug, `AC-${categoryId}${String(i + 1).padStart(3, '0')}`,
            desc,
            `${desc}\n\nAuraCraft-এর প্রতিটি প্রোডাক্ট হাতে বাছাই করা এবং কোয়ালিটি চেক করা। ১০০% অরিজিনাল পণ্যের নিশ্চয়তা সহ সারা বাংলাদেশে দ্রুত ডেলিভারি।`,
            price, compare, 20 + ((i * 7) % 40), material, color, sizes, '৭ দিনের রিপ্লেসমেন্ট',
            (4 + ((i % 10) / 10)).toFixed(2), 12 + i * 5, featured ? 1 : 0,
          ]
        );
        const productId = prodRes.insertId;
        // rotate the pool per product so neighbouring cards never share a primary photo
        const rotated = gallery.map((_, k) => gallery[(k + i) % gallery.length]);
        const images = rotated.map((id, idx) => [productId, img(id), name, idx === 0 ? 1 : 0, idx]);
        await conn.query('INSERT INTO product_images (product_id, url, alt, is_primary, sort_order) VALUES ?', [images]);
      }
    }

    await conn.query('INSERT INTO team_members (name, role, bio, photo_url, sort_order) VALUES ?', [
      team.map((t, i) => [...t, i]),
    ]);

    await conn.query('INSERT INTO settings (setting_key, setting_value) VALUES ?', [Object.entries(settings)]);
  });

  const [{ c: productCount }] = await query('SELECT COUNT(*) AS c FROM products');
  console.log(`✔ Seed complete — ${categories.length} categories, ${productCount} products, ${team.length} team members`);
  console.log(`  admin login: ${env.admin.email} / ${env.admin.password}`);
  console.log('  immortal login: immortal@auracraft.com / immortal123');
  await pool.end();
};

run().catch(async (error) => {
  console.error('✖ Seed failed:', error.message);
  await pool.end();
  process.exit(1);
});
