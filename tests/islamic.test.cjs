const { test } = require("node:test");
const assert = require("node:assert");

const {
  ISLAMIC_CONTENT_TYPES,
  ISLAMIC_HADITH_SOURCES,
  DEFAULT_AZKAR_CATEGORIES,
  AZKAR_CATEGORIES,
  HADITH_BOOK_NAMES,
  HADITH_MAX_NUMBERS,
  normalizeContentTypes,
  normalizeHadithSources,
  normalizeAzkarCategories,
  createDefaultIslamicContent
} = require("../shared/dist/constants/islamic.js");

const {
  isRecentlySent,
  pruneRecent,
  buildQuranItem,
  buildAzkarItem,
  buildIslamicEmbed,
  postIslamicContent,
  truncate
} = require("../bot/dist/modules/islamicContent/contentService.js");

const { fetchHadith } = require("../bot/dist/modules/islamicContent/hadithApi.js");

const {
  computeNextRunAt,
  ensureScheduler,
  stopIslamicScheduler,
  schedulerCount,
  isIslamicSchedulerActive
} = require("../bot/dist/modules/islamicContent/islamicContentManager.js");

test("islamic: تصفية أنواع المحتوى (معروفة فقط + الافتراضي عند الفراغ)", () => {
  const known = ISLAMIC_CONTENT_TYPES.map((t) => t.id);
  assert.deepEqual(normalizeContentTypes(["quran", "hadith", "bogus", "azkar"]), [
    "quran",
    "hadith",
    "azkar"
  ]);
  assert.deepEqual(normalizeContentTypes(["bogus"]), known);
  assert.deepEqual(normalizeContentTypes([]), known);
  assert.deepEqual(normalizeContentTypes(["quran", "quran"]), ["quran"]);
});

test("islamic: تصفية مصادر الأحاديث (Bukhari/Muslim فقط + الافتراضي عند الفراغ)", () => {
  const known = ISLAMIC_HADITH_SOURCES.map((s) => s.id);
  assert.deepEqual(normalizeHadithSources(["Bukhari", "Tirmidhi", "Muslim"]), [
    "Bukhari",
    "Muslim"
  ]);
  assert.deepEqual(normalizeHadithSources([]), known);
  assert.deepEqual(normalizeHadithSources(["Nasa'i"]), known);
});

test("islamic: تصفية تصنيفات الأذكار (أسماء المكتبة فقط + الافتراضي عند الفراغ)", () => {
  const sample = ["أذكار الصباح", "تصنيف وهمي", "أذكار النوم"];
  assert.deepEqual(normalizeAzkarCategories(sample), ["أذكار الصباح", "أذكار النوم"]);
  assert.deepEqual(normalizeAzkarCategories([]), DEFAULT_AZKAR_CATEGORIES);
  assert.ok(AZKAR_CATEGORIES.length >= 100, "يجب أن تحتوي قائمة التصنيفات على أكثر من 100 تصنيف");
  for (const c of DEFAULT_AZKAR_CATEGORIES) assert.ok(AZKAR_CATEGORIES.includes(c));
});

test("islamic: أسماء وأرقام الكتب الثابتة صحيحة", () => {
  assert.equal(HADITH_BOOK_NAMES.Bukhari, "صحيح البخاري");
  assert.equal(HADITH_BOOK_NAMES.Muslim, "صحيح مسلم");
  assert.equal(HADITH_MAX_NUMBERS.Bukhari, 7563);
  assert.equal(HADITH_MAX_NUMBERS.Muslim, 7563);
});

test("islamic: منع التكرار isRecentlySent داخل النافذة فقط", () => {
  const now = 1_000_000_000_000;
  const recent = [{ id: "a:1", at: new Date(now - 60_000).toISOString() }];
  assert.ok(isRecentlySent("a:1", recent, 180 * 60_000, now));
  assert.ok(!isRecentlySent("a:2", recent, 180 * 60_000, now));
  assert.ok(!isRecentlySent("a:1", recent, 30_000, now));
  assert.ok(!isRecentlySent("a:1", [], 180 * 60_000, now));
});

test("islamic: تنظيف سجل منع التكرار pruneRecent يزيل القديم ويحافظ على الحد الأقصى", () => {
  const now = 1_000_000_000_000;
  const recent = [
    { id: "a:old", at: new Date(now - 200 * 60_000).toISOString() },
    { id: "a:new", at: new Date(now - 1000).toISOString() }
  ];
  const pruned = pruneRecent(recent, 180 * 60_000, now);
  assert.deepEqual(pruned.map((r) => r.id), ["a:new"]);

  const many = Array.from({ length: 40 }, (_, i) => ({
    id: `a:${i}`,
    at: new Date(now - 1000).toISOString()
  }));
  const prunedMany = pruneRecent(many, 180 * 60_000, now);
  assert.equal(prunedMany.length, 25);
});

test("islamic: عنصر قرآن عشوائي — الشكل والمعرّف صحيحان", () => {
  const item = buildQuranItem();
  assert.equal(item.type, "quran");
  assert.match(item.id, /^q:.+:\d+$/);
  assert.ok(item.title.startsWith("سورة "));
  assert.ok(item.title.includes("— آية"));
  assert.ok(item.text.length > 0);
});

test("islamic: عنصر ذكر عشوائي — الاستبعاد يحترم سجل منع التكرار", () => {
  const categories = ["أذكار الصباح"];
  const item = buildAzkarItem(categories);
  assert.equal(item.type, "azkar");
  assert.equal(item.title, "أذكار الصباح");
  assert.ok(item.text.length > 0);

  const exclude = new Set([item.id]);
  for (let i = 0; i < 20; i++) {
    const next = buildAzkarItem(categories, exclude);
    assert.ok(!exclude.has(next.id), "يجب ألا يعيد العنصر المستبعد");
  }
});

test("islamic: تنسيق الإيمبد — قرآن/حديث/أذكار مع ظهور المصدر", () => {
  const quran = buildIslamicEmbed({
    id: "q:البقرة:255",
    type: "quran",
    title: "سورة البقرة — آية 255",
    text: "الله لا إله إلا هو الحي القيوم"
  });
  assert.equal(quran.data.title, "سورة البقرة — آية 255");
  assert.match(quran.data.description, /الحي القيوم/);

  const hadith = buildIslamicEmbed({
    id: "h:Bukhari:7563",
    type: "hadith",
    title: "حديث",
    text: "نص الحديث",
    source: "صحيح البخاري",
    number: 7563
  });
  assert.match(hadith.data.footer.text, /المصدر: صحيح البخاري/);
  assert.match(hadith.data.footer.text, /رقم الحديث 7563/);

  const azkar = buildIslamicEmbed({
    id: "a:1",
    type: "azkar",
    title: "أذكار الصباح",
    text: "الذكر",
    source: "مسلم",
    count: "3"
  });
  assert.match(azkar.data.footer.text, /التكرار: 3 مرات/);
  assert.match(azkar.data.footer.text, /المصدر: مسلم/);

  const azkarOnce = buildIslamicEmbed({
    id: "a:2",
    type: "azkar",
    title: "أذكار المساء",
    text: "الذكر"
  });
  assert.ok(!(azkarOnce.data.footer?.text ?? "").includes("التكرار"));
});

test("islamic: اقتطاع النصوص الطويلة", () => {
  assert.equal(truncate("قصير", 10), "قصير");
  assert.ok(truncate("x".repeat(5000), 3900).length <= 3900 + 3);
});

test("islamic: التعامل مع عدم تحديد القناة — إرجاع no-channel بلا توقف", async () => {
  const result = await postIslamicContent(
    { channels: { fetch: async () => null } },
    { ...createDefaultIslamicContent(), channelId: null }
  );
  assert.deepEqual(result, { ok: false, reason: "no-channel" });
});

test("islamic: التعامل مع قناة غير موجودة — إرجاع channel-not-found بلا توقف", async () => {
  const result = await postIslamicContent(
    { channels: { fetch: async () => null } },
    { ...createDefaultIslamicContent(), channelId: "123" }
  );
  assert.deepEqual(result, { ok: false, reason: "channel-not-found" });
});

test("islamic: التعامل مع فشل الشبكة (الأحاديث) — إرجاع no-content بلا توقف", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });
  try {
    const config = {
      ...createDefaultIslamicContent(),
      channelId: "123",
      contentTypes: ["hadith"]
    };
    const result = await postIslamicContent(
      { channels: { fetch: async () => ({ isTextBased: () => true, send: async () => ({}) }) } },
      config
    );
    assert.deepEqual(result, { ok: false, reason: "no-content" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("islamic: التعامل مع نقص صلاحيات الإرسال — إرجاع error دون إيقاف الجدولة", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });
  try {
    const config = {
      ...createDefaultIslamicContent(),
      channelId: "123",
      contentTypes: ["quran"]
    };
    const result = await postIslamicContent(
      {
        channels: {
          fetch: async () => ({
            isTextBased: () => true,
            send: async () => {
              throw new Error("Missing Permissions");
            }
          })
        }
      },
      config
    );
    assert.equal(result.ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("islamic: fetchHadith يفسر استجابة صالحة ويعيد null للاستجابات الفاشلة", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      metadata: { name: "Sahih al Bukhari" },
      hadiths: [{ hadithnumber: 1, text: "نص تجريبي للحديث" }]
    })
  });
  try {
    const hadith = await fetchHadith("Bukhari", 1);
    assert.equal(hadith.number, 1);
    assert.equal(hadith.text, "نص تجريبي للحديث");
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => ({ ok: false });
  try {
    assert.equal(await fetchHadith("Bukhari", 999999), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("islamic: computeNextRunAt — الآن + الفترة مع حد أدنى دقيقة", () => {
  const now = 1_000_000_000_000;
  assert.equal(new Date(computeNextRunAt(60, now)).getTime(), now + 60 * 60_000);
  assert.equal(new Date(computeNextRunAt(0, now)).getTime(), now + 60_000);
  assert.equal(new Date(computeNextRunAt(-5, now)).getTime(), now + 60_000);
});

test("islamic: جدول واحد فقط لكل سيرفر (إيقاف القديم عند إعادة الإنشاء)", () => {
  const fakeClient = {};
  const base = {
    enabled: true,
    channelId: "123",
    intervalMinutes: 60,
    contentTypes: ["quran"],
    allowedSources: ["Bukhari"],
    azkarCategories: ["أذكار الصباح"],
    antiRepeatMinutes: 180,
    recentlySent: [],
    nextRunAt: new Date(Date.now() + 10 * 60_000).toISOString()
  };

  assert.equal(schedulerCount(), 0);
  ensureScheduler(fakeClient, "g1", base);
  assert.equal(schedulerCount(), 1);
  assert.ok(isIslamicSchedulerActive("g1"));

  // إعادة الإنشاء (تعديل الإعدادات) يجب ألا تضاعف الجدول
  ensureScheduler(fakeClient, "g1", { ...base, intervalMinutes: 30 });
  assert.equal(schedulerCount(), 1);

  // معطّل أو بلا قناة = لا جدول
  ensureScheduler(fakeClient, "g2", { ...base, enabled: false });
  assert.equal(schedulerCount(), 1);
  ensureScheduler(fakeClient, "g2", { ...base, channelId: null });
  assert.equal(schedulerCount(), 1);

  stopIslamicScheduler("g1");
  assert.equal(schedulerCount(), 0);
});