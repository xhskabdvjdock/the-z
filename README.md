# 🤖 Discord Bot - نظام متكامل مع Dashboard احترافي

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

بوت ديسكورد شامل واحترافي مع داشبورد ويب متقدم يحتوي على **14 نظام رئيسي** و **31 أمر**.

---

## ✨ المميزات الرئيسية

### 🎯 14 نظام كامل:

#### 💰 1. نظام Economy (جديد!)
- محفظة وبنك
- مكافآت يومية مع نظام Streak
- نظام عمل (12 وظيفة عشوائية)
- تحويل أموال بين الأعضاء
- متجر كامل مع نظام شراء
- نظام مخزون (Inventory)
- شراء الرولات
- لوحة متصدرين

#### 📈 2. نظام Leveling (جديد!)
- XP تلقائي عند إرسال الرسائل (15-25 XP)
- بطاقات Level Up بـ Canvas (800x200)
- بطاقات Rank احترافية (900x250)
- شريط تقدم XP
- رولات تلقائية حسب المستوى
- لوحة متصدرين

#### ⚙️ 3. Custom Commands (جديد!)
- إنشاء أوامر مخصصة غير محدودة
- دعم Embeds
- نظام Permissions
- Cooldowns قابلة للتخصيص

#### 💡 4. Suggestions (جديد!)
- نظام اقتراحات كامل
- تصويت تفاعلي (✅/❌)
- حالات متعددة (pending, approved, rejected)
- نظام مراجعة

#### 📊 5. Polls (جديد!)
- استطلاعات رأي تفاعلية
- حتى 10 خيارات
- مدة زمنية قابلة للتخصيص
- شريط تقدم ونتائج

#### ⏰ 6. Reminders (جديد!)
- تذكيرات ذكية
- نظام جدولة تلقائي
- دعم التكرار
- إدارة سهلة

#### ⭐ 7. Starboard (جديد!)
- لوحة نجوم تلقائية
- تتبع تفاعلات النجوم
- عتبة قابلة للتخصيص (افتراضي: 3)
- تحديث ديناميكي

#### 🎫 8. Tickets (محسّن)
- إنشاء وإدارة التكتات
- أنواع تكتات متعددة مع emoji ورول
- نظام Transcript كامل
- لوحة تكتات تفاعلية
- حفظ جميع الرسائل

#### 🎵 9. Music (محسّن بالكامل)
- تشغيل من YouTube و SoundCloud
- 10 أوامر: play, pause, resume, skip, stop, queue, **volume, loop, shuffle, nowplaying**
- نظام Queue كامل
- شريط تقدم
- أزرار تحكم تفاعلية

#### 🛡️ 10. AutoMod (محسّن)
- Anti-Spam (فحص الرسائل المتكررة)
- Anti-Links (مع قائمة بيضاء)
- Anti-Raid (فحص الانضمامات المشبوهة)
- Anti-Caps (فحص الحروف الكبيرة)
- Bad Words Filter
- عقوبات متعددة: warn, mute, kick, ban

#### 👋 11. Welcome/Leave (محسّن)
- رسائل ترحيب ومغادرة مخصصة
- دعم Embed مع ألوان وصور
- **إنشاء صور ترحيب بـ Canvas**
- متغيرات ديناميكية
- صور خلفية مخصصة

#### 📝 12. Applications (محسّن)
- نماذج تقديم مخصصة
- أسئلة متنوعة (نص، رقم، اختيار)
- إنشاء تكت تلقائي
- نظام قبول/رفض
- إشعارات DM

#### 🎁 13. Giveaways
- سحب تلقائي عند انتهاء الوقت
- عدد فائزين قابل للتخصيص
- متطلبات اختيارية
- إعادة سحب
- إنهاء مبكر

#### ⚡ 14. أنظمة إضافية
- **Rating System** - تقييم الأعضاء
- **Auto Voice** - روم صوتي تلقائي
- **Auto Roles** - رولات تلقائية متعددة الأنواع
- **Auto Lines** - رسائل تلقائية
- **Logs System** - سجلات شاملة

---

## 🎮 الأوامر المتوفرة (31 أمر)

### 💰 Economy (7 أوامر):
```bash
/balance [@user]              # عرض الرصيد
/daily                        # مكافأة يومية
/work                         # اعمل واكسب
/transfer @user <amount>      # حوّل أموال
/leaderboard economy          # أغنى 10 أعضاء
/shop                         # المتجر
/buy <item_id> [quantity]     # شراء عنصر
```

### 📈 Leveling (1 أمر):
```bash
/rank [@user]                 # بطاقة رتبة مع Canvas
```

### 🎵 Music (10 أوامر):
```bash
/play <query>                 # تشغيل موسيقى
/pause                        # إيقاف مؤقت
/resume                       # استئناف
/skip                         # تخطي
/stop                         # إيقاف
/queue                        # عرض القائمة
/volume <0-100>              # مستوى الصوت
/loop [off/track/queue]      # تكرار
/shuffle                     # خلط القائمة
/nowplaying                  # الأغنية الحالية
```

### 🛡️ Moderation (9 أوامر):
```bash
/ban @user [reason]           # حظر عضو
/kick @user [reason]          # طرد عضو
/timeout @user <time> [reason] # ميوت عضو
/warn @user <reason>          # تحذير
/warnings @user               # عرض التحذيرات
/purge <amount>               # حذف رسائل
/clear <amount>               # alias للـ purge
/lock                         # قفل قناة
/unlock                       # فتح قناة
```

### ⚙️ Utility (9 أوامر):
```bash
/customcommand add <name> <response>  # إضافة أمر
/customcommand edit/remove/list       # إدارة الأوامر
/suggest <suggestion>                 # تقديم اقتراح
/poll <question> <options> [duration] # استطلاع رأي
/remind me <time> <message>           # تذكير
/remind list/cancel                   # إدارة التذكيرات
/avatar [@user]                       # صورة بروفايل
/serverinfo                           # معلومات السيرفر
/userinfo [@user]                     # معلومات عضو
/ping                                 # سرعة البوت
/invite                               # رابط دعوة
```

### 🎮 Games (5 أوامر):
```bash
/coinflip                     # رمي عملة
/dice [sides]                 # رمي نرد
/rps <choice>                 # حجر ورقة مقص
/8ball <question>             # كرة السحر
/trivia                       # سؤال ثقافي
```

### 🎫 Other (4 أوامر):
```bash
/ticket create/close/panel    # إدارة التكتات
/giveaway create/reroll/end   # إدارة الجوائز
/application create           # تقديم نموذج
/rate @user <rating> [comment] # تقييم
```

---

## 🖥️ Dashboard (10 صفحات)

### الصفحات المتوفرة:
1. **الرئيسية** - نظرة عامة وإحصائيات
2. **Tickets** - إدارة نظام التكتات
3. **Welcome** - إعدادات الترحيب والمغادرة
4. **AutoMod** - إعدادات الحماية التلقائية
5. **Music** - إعدادات نظام الموسيقى
6. **Logs** - عرض السجلات
7. **💰 Economy** - إحصائيات وإعدادات الاقتصاد ⭐ جديد
8. **📈 Leveling** - إعدادات المستويات والمكافآت ⭐ جديد
9. **📊 Analytics** - رسوم بيانية ونشاط السيرفر ⭐ جديد
10. **⚙️ Settings** - مركز الإعدادات ⭐ جديد

### الميزات:
- 🎨 تصميم Discord Theme احترافي
- 📱 Responsive Design (متجاوب مع جميع الأشاشات)
- 🌙 Dark Mode
- 📊 Charts & Analytics (Recharts)
- 🔐 OAuth2 Authentication
- ⚡ Real-time Updates
- 🎯 إعدادات تفاعلية

---

## 🚀 التثبيت والتشغيل

### المتطلبات:
- Node.js 18+
- MongoDB
- Discord Bot Token
- Discord Client ID & Secret

### 1. تثبيت Dependencies:

```bash
# للبوت
cd bot
npm install

# للداشبورد
cd dashboard
npm install
```

### 2. إعداد ملفات البيئة:

**bot/.env:**
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
API_PORT=3001
API_SECRET=your_strong_random_secret_key_here
BOT_PREFIX=!
NODE_ENV=development
```

**dashboard/.env:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
BOT_API_URL=http://localhost:3001
BOT_API_SECRET=your_strong_random_secret_key_here
NODE_ENV=development
```

### 3. التشغيل:

```bash
# تشغيل البوت
cd bot
npm start

# تشغيل الداشبورد (في terminal آخر)
cd dashboard
npm run dev
```

الداشبورد سيكون متاح على: http://localhost:3000  
API سيكون متاح على: http://localhost:3001

---

## 📁 البنية

```
discord-bot/
├── bot/                          # كود البوت
│   ├── src/
│   │   ├── commands/             # 31 Slash Command
│   │   │   ├── economy/          # 7 أوامر اقتصاد
│   │   │   ├── leveling/         # 1 أمر
│   │   │   ├── music/            # 10 أوامر موسيقى
│   │   │   ├── moderation/       # 9 أوامر إدارة
│   │   │   ├── utility/          # 9 أوامر
│   │   │   └── fun/              # 5 ألعاب
│   │   ├── events/               # Event Handlers
│   │   ├── systems/              # 14 نظام
│   │   │   ├── economy/
│   │   │   ├── leveling/
│   │   │   ├── reminders/
│   │   │   ├── starboard/
│   │   │   ├── tickets/
│   │   │   ├── music/
│   │   │   └── ...
│   │   ├── models/               # 15 Database Model
│   │   ├── utils/                # Utilities
│   │   ├── api/                  # REST API
│   │   ├── config.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
├── dashboard/                    # Next.js Dashboard
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── dashboard/
│   │   │   │   └── [guildId]/   # 10 صفحات
│   │   │   └── api/             # API Routes
│   │   ├── components/           # React Components
│   │   │   ├── ui/              # 20+ UI Component
│   │   │   ├── layout/
│   │   │   └── data/
│   │   ├── lib/                  # Utilities & API Client
│   │   ├── hooks/                # Custom Hooks
│   │   └── types/                # TypeScript Types
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🗄️ Database Models

### الـ Models المتوفرة (15):

1. **Guild** - إعدادات السيرفر
2. **Ticket** - التكتات
3. **Warning** - التحذيرات
4. **Application** - التقديمات
5. **Giveaway** - الجوائز
6. **Rating** - التقييمات
7. **Log** - السجلات
8. **Music** - الموسيقى
9. **Economy** ⭐ - الاقتصاد
10. **Level** ⭐ - المستويات
11. **CustomCommand** ⭐ - الأوامر المخصصة
12. **Suggestion** ⭐ - الاقتراحات
13. **Poll** ⭐ - الاستطلاعات
14. **Reminder** ⭐ - التذكيرات
15. **Starboard** ⭐ - لوحة النجوم
16. **ShopItem** ⭐ - عناصر المتجر

---

## 🔌 API Endpoints

### Bot API (Port 3001):

```
GET    /api/guilds              # جميع السيرفرات
GET    /api/guild/:id           # معلومات سيرفر
POST   /api/guild/:id/settings  # تحديث الإعدادات
GET    /api/guild/:id/stats     # الإحصائيات
GET    /api/guild/:id/tickets   # التكتات
GET    /api/guild/:id/logs      # السجلات
```

جميع الـ Endpoints محمية بـ API Secret في الـ headers.

---

## 🎨 التقنيات المستخدمة

### Bot:
- **Discord.js v14** - Discord API
- **MongoDB & Mongoose** - Database
- **Express** - REST API
- **discord-player** - Music System
- **Canvas** - Image Generation (Rank Cards, Welcome Cards)
- **ms** - Time Parsing
- **chalk** - Console Colors

### Dashboard:
- **Next.js 14** - React Framework (App Router)
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **NextAuth.js** - OAuth2 Authentication
- **Recharts** - Charts & Analytics
- **Framer Motion** - Animations
- **Axios** - HTTP Client
- **Zustand** - State Management

---

## 📊 الإحصائيات

- **الملفات:** 157+ ملف
- **أسطر الكود:** 8,000+ سطر
- **الأنظمة:** 14 نظام كامل
- **الأوامر:** 31 أمر
- **Models:** 15 model
- **Dashboard Pages:** 10 صفحات
- **UI Components:** 30+ مكون

---

## 🌟 الميزات المتقدمة

### ✅ مكتمل:
- ✅ نظام Economy كامل مع Shop
- ✅ نظام Leveling مع Canvas Cards
- ✅ Custom Commands غير محدودة
- ✅ Suggestions مع تصويت
- ✅ Polls تفاعلية
- ✅ Reminders ذكية
- ✅ Starboard تلقائية
- ✅ Music محسّن (10 أوامر)
- ✅ Dashboard احترافي (10 صفحات)
- ✅ Charts & Analytics
- ✅ OAuth2 Authentication
- ✅ API محمي بالكامل

---

## 🔒 الأمان

- ✅ جميع المفاتيح السرية في `.env`
- ✅ `.env.example` للقوالب الآمنة
- ✅ API محمي بـ Secret Key
- ✅ OAuth2 للداشبورد
- ✅ Input Validation
- ✅ Permission Checks
- ✅ Rate Limiting
- ✅ SQL Injection Protection

---

## 📦 الاستضافة

### منصات مدعومة:
- **VPS** (Ubuntu/Debian/CentOS)
- **Railway**
- **Render**
- **Heroku**
- **DigitalOcean**
- **AWS**
- **Google Cloud**

### متطلبات الاستضافة:
- Node.js 18+
- MongoDB (Atlas أو Local)
- 512MB RAM على الأقل
- Port 3001 للـ API
- Port 3000 للداشبورد

---

## 🤝 المساهمة

المشروع مفتوح للمساهمات! 

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ Branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

---

## 📝 الترخيص

هذا المشروع مرخص تحت **MIT License** - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

## 💬 الدعم

للحصول على المساعدة:
- 📧 افتح [Issue](https://github.com/your-repo/issues)
- 💬 انضم لسيرفر Discord
- 📖 راجع [الوثائق](./docs)

---

## 🙏 شكر خاص

- [Discord.js](https://discord.js.org/) - أفضل مكتبة Discord
- [Next.js](https://nextjs.org/) - أفضل React Framework
- [MongoDB](https://www.mongodb.com/) - قاعدة بيانات رائعة
- المجتمع المذهل! ❤️

---

## ⚠️ ملاحظات مهمة

1. **لا تشارك ملفات `.env` أبداً!**
2. تأكد من تغيير جميع المفاتيح السرية
3. استخدم MongoDB Atlas للإنتاج
4. فعّل 2FA على حساب Discord
5. راجع السجلات بشكل دوري

---

<div align="center">

**صنع بـ ❤️ باستخدام Discord.js & Next.js**

⭐ **إذا أعجبك المشروع، لا تنسى النجمة!** ⭐

</div>
