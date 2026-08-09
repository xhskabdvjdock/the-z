# تعليمات النشر على Render

## المتطلبات المسبقة

1. حساب على [Render](https://render.com)
2. حساب على [Discord Developer Portal](https://discord.com/developers/applications)
3. قاعدة بيانات PostgreSQL (يمكنك استخدام Render PostgreSQL أو YugabyteDB Managed)
4. ملف شهادة SSL (root.crt) إذا كنت تستخدم sslmode=verify-full

## الخطوة 1: إعداد قاعدة البيانات

### خيار 1: استخدام Render PostgreSQL
1. في لوحة تحكم Render، أنشئ "PostgreSQL" جديد
2. بعد الإنشاء، انسخ "Internal Database URL"
3. ستكون بصيغة: `postgresql://user:password@host:5432/dbname`

### خيار 2: استخدام YugabyteDB Managed
1. أنشئ حساب على [YugabyteDB Managed](https://cloud.yugabyte.com)
2. أنشئ cluster جديد
3. انسخ "Connection String"
4. ستكون بصيغة: `postgresql://user:password@host:5433/dbname?sslmode=verify-full`
5. حمّل ملف `root.crt` من لوحة التحكم

## الخطوة 2: إعداد تطبيق Discord

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. أنشئ تطبيق جديد أو اختر تطبيق موجود
3. في قسم "Bot":
   - فعّل الـ Bot
   - انسخ الـ Token
4. في قسم "OAuth2 > General":
   - انسخ Client ID
   - أنشئ Client Secret جديد وانسخه
5. في قسم "OAuth2 > Redirects":
   - أضف رابط الـ Dashboard: `https://your-dashboard-url.onrender.com/api/auth/callback/discord`
6. في قسم "Bot > Privileged Gateway Intents":
   - فعّل جميع الـ Intents المطلوبة

## الخطوة 3: رفع الكود على GitHub

1. تأكد من أن جميع الملفات جاهزة في الريبو
2. ادفع الكود إلى GitHub:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push
   ```

## الخطوة 4: إنشاء خدمات على Render

### الطريقة الأ: استخدام render.yaml (موصى به)

1. في لوحة تحكم Render، اختر "New +"
2. اختر "Blueprint"
3. اختر الريبو الخاص بك
4. Render سيقرأ ملف `render.yaml` تلقائياً
5. راجع الإعدادات واضغط "Apply"

### الطريقة ب: إنشاء يدوياً

#### خدمة البوت (Worker Service)
1. "New +" → "Worker Service"
2. الاسم: `thez-bot`
3. الريبو: اختر ريبوك
4. Build: Docker
5. Docker Context: `.`
6. Dockerfile Path: `./bot/Dockerfile`
7. Environment Variables:
   - `DISCORD_TOKEN`: من Discord Developer Portal
   - `DISCORD_CLIENT_ID`: من Discord Developer Portal
   - `DISCORD_CLIENT_SECRET`: من Discord Developer Portal
   - `DATABASE_URL`: من قاعدة البيانات
   - `DASHBOARD_URL`: رابط الـ Dashboard بعد إنشائه

#### خدمة الـ Dashboard (Web Service)
1. "New +" → "Web Service"
2. الاسم: `thez-dashboard`
3. الريبو: اختر ريبوك
4. Build: Docker
5. Docker Context: `.`
6. Dockerfile Path: `./dashboard/Dockerfile`
7. Environment Variables:
   - `DISCORD_CLIENT_ID`: من Discord Developer Portal
   - `DISCORD_CLIENT_SECRET`: من Discord Developer Portal
   - `DISCORD_BOT_TOKEN`: من Discord Developer Portal
   - `NEXTAUTH_SECRET`: قيمة عشوائية (يمكنك توليدها بـ: `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: رابط الـ Dashboard (سيكون: `https://thez-dashboard.onrender.com`)
   - `DATABASE_URL`: من قاعدة البيانات
   - `DB_SSL_CA_PATH`: `/app/certs/root.crt`

## الخطوة 5: إعداد الشهادات SSL

إذا كنت تستخدم sslmode=verify-full:

1. في خدمة البوت، اذهب إلى "Disks"
2. أنشئ disk جديد باسم `certs` بمسار `/app/certs`
3. ارفع ملف `root.crt` إلى هذا الـ disk
4. تأكد من أن `DB_SSL_CA_PATH` مضبوط على `/app/certs/root.crt`

## الخطوة 6: (اختياري) إعداد Redis

Redis يُستخدم للبيانات المؤقتة عالية التردد فقط (cooldowns / rate limits / عدّادات / كاشات). **بدون Redis يشتغل البوت طبيعيًا** على ذاكرة العملية مع تحذير واحد — الإعداد مطلوب فقط عند الحاجة للتوزيع الأفقي.

1. يمكنك استخدام **Render Redis** أو أي Redis مُدار (Upstash...) يوفّر URL
2. أضف متغير البيئة `REDIS_URL` (مثال: `redis://user:pass@host:6379`)
3. اختياري: `REDIS_CONNECT_TIMEOUT_MS=3000` (الافتراضي 3000)
4. `REDIS_URL` لا تُسجَّل في أي log تلقائيًا — لا تضعها في ملفات عامة

### Docker Compose محليًا

```bash
docker compose up -d redis   # يرفع Redis داخل الشبكة (غير مكشوف للعامة)
REDIS_URL=redis://redis:6379/0 npm run dev:bot
```

## الخطوة 7: تحديث رابط الـ Dashboard في Discord

بعد إنشاء الـ Dashboard:

1. انسخ رابط الـ Dashboard من Render
2. عد إلى Discord Developer Portal
3. في قسم "OAuth2 > Redirects":
   - أضف الرابط الجديد: `https://your-dashboard-url.onrender.com/api/auth/callback/discord`
4. حدّث `DASHBOARD_URL` في خدمة البوت
5. أعد تشغيل خدمة البوت

## الخطوة 7: تسجيل أوامر البوت

بعد تشغيل البوت لأول مرة:

1. اذهب إلى خدمة البوت في Render
2. افتح "Logs"
3. ابحث عن رسالة تؤكد تشغيل البوت
4. سجّل الأوامر يدوياً أو استخدم `DEV_GUILD_ID` للتسجيل التلقائي

## استكشاف الأخطاء

### البوت لا يتصل بقاعدة البيانات
- تأكد من صحة `DATABASE_URL`
- تأكد من إعداد الشهادات SSL بشكل صحيح
- تحقق من Logs في خدمة البوت

### تسجيل الدخول عبر Discord لا يعمل
- تأكد من إضافة رابط الـ Redirect في Discord Developer Portal
- تأكد من صحة `NEXTAUTH_SECRET`
- تحقق من أن `NEXTAUTH_URL` يطابق رابط الـ Dashboard الفعلي

### البوت لا يستجيب للأوامر
- تأكد من تسجيل الأوامر (Slash Commands)
- تأكد من تفعيل الـ Intents المطلوبة في Discord Developer Portal
- تحقق من Logs للتأكد من تشغيل البوت

## ملاحظات مهمة

- Render يوفر خطة مجانية مع حدود (512MB RAM، 0.1 CPU)
- للبوتات الكبيرة، قد تحتاج إلى خطة مدفوعة
- تأكد من مراقبة الاستخدام والـ Logs بانتظام
- يمكنك استخدام Render PostgreSQL المجاني للتجربة
