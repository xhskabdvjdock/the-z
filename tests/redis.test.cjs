const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
  MemoryRedisBackend,
  NS,
  nsKey,
  RedisCacheImpl,
  RedisCounterImpl,
  HybridCooldownStore,
  COOLDOWN_MAX_TTL_MS,
  MemoryRateLimiterAsync,
  RedisRateLimiter,
  createRateLimiterAsync,
  buildRedisServices
} = require("../shared/dist/index.js");

// ═══════════════════════════════
// 1) Backend: set/get/delete/expiration
// ═══════════════════════════════
describe("RedisBackend (memory): set/get/TTL/expiration", () => {
  test("set → get returns value; missing → null", async () => {
    const b = new MemoryRedisBackend();
    await b.set("k", "v", 60_000);
    assert.equal(await b.get("k"), "v");
    assert.equal(await b.get("nope"), null);
  });

  test("TTL: بعد انتهاء المدة يختفي المفتاح (ساعة افتراضية)", async () => {
    let now = 1_000;
    const b = new MemoryRedisBackend(() => now);
    await b.set("k", "v", 1_000); // ينتهي عند now=2000
    assert.equal(await b.get("k"), "v");
    now = 2_001;
    assert.equal(await b.get("k"), null);
  });

  test("delete removes; expire يطيل العمر", async () => {
    let now = 1_000;
    const b = new MemoryRedisBackend(() => now);
    await b.set("k", "v", 10_000);
    await b.expire("k", 50_000);
    now = 20_000;
    assert.equal(await b.get("k"), "v");
    await b.delete("k");
    assert.equal(await b.get("k"), null);
  });

  test("incr atomic: قيمة جديدة مع TTL", async () => {
    const b = new MemoryRedisBackend();
    assert.equal(await b.incr("c", 10_000), 1);
    assert.equal(await b.incr("c", 10_000), 2);
    assert.equal(await b.getEx("c"), "2");
  });
});

// ═══════════════════════════════
// 2) RedisCounter: TTL إجباري + atomicity
// ═══════════════════════════════
describe("RedisCounter", () => {
  test("increment/get/reset", async () => {
    const c = new RedisCounterImpl(new MemoryRedisBackend());
    assert.equal(await c.increment("spam:g:u", 10_000), 1);
    assert.equal(await c.increment("spam:g:u", 10_000), 2);
    assert.equal(await c.get("spam:g:u"), 2);
    await c.reset("spam:g:u");
    assert.equal(await c.get("spam:g:u"), 0);
  });

  test("TTL=0 مرفوض (لا عدّاد بلا انتهاء)", async () => {
    const c = new RedisCounterImpl(new MemoryRedisBackend());
    await assert.rejects(() => c.increment("bad", 0), /TTL/);
  });

  test("تزامن 50 زيادة → 50 بلا فقد (atomic)", async () => {
    const c = new RedisCounterImpl(new MemoryRedisBackend());
    await Promise.all(Array.from({ length: 50 }, () => c.increment("race", 60_000)));
    assert.equal(await c.get("race"), 50);
  });
});

// ═══════════════════════════════
// 3) RedisCache
// ═══════════════════════════════
describe("RedisCache", () => {
  test("set/get/JSON roundtrip", async () => {
    const cache = new RedisCacheImpl(new MemoryRedisBackend());
    await cache.set("guild:111:cfg", { hello: "world" }, 30_000);
    assert.deepEqual(await cache.get("guild:111:cfg"), { hello: "world" });
    assert.equal(await cache.get("nothing"), null);
  });

  test("delete / deleteMany / TTL", async () => {
    let now = 1_000;
    const cache = new RedisCacheImpl(new MemoryRedisBackend(() => now), 60_000);
    await cache.set("a", 1, 1_000);
    await cache.set("b", 2, 60_000);
    now = 5_000; // "a" انتهى، "b" باقٍ
    assert.equal(await cache.get("a"), null);
    assert.deepEqual(await cache.get("b"), 2);
    await cache.deleteMany(["a", "b"]);
    assert.equal(await cache.get("b"), null);
  });
});

// ═══════════════════════════════
// 4) HybridCooldownStore — الواجهة نفسها (الأوامر لا تعرف Redis)
// ═══════════════════════════════
describe("HybridCooldownStore", () => {
  test("set/get/delete + مرور الكتابة إلى Redis مع TTL", async () => {
    const backend = new MemoryRedisBackend();
    const store = new HybridCooldownStore(backend);
    store.set("ban:g:u", 12345);
    assert.equal(store.get("ban:g:u"), 12345);
    const remote = await backend.get(nsKey(NS.cooldown, "ban:g:u"));
    assert.equal(remote, "12345");
    assert.ok(COOLDOWN_MAX_TTL_MS > 0, "TTL إجباري معرّف");
    store.delete("ban:g:u");
    assert.equal(store.get("ban:g:u"), null);
  });

  test("فشل Redis لا يكسر السلوك المحلي (fallback آمن)", async () => {
    const failing = {
      set: async () => { throw new Error("redis down"); },
      delete: async () => { throw new Error("redis down"); }
    };
    const store = new HybridCooldownStore(failing, (msg) => assert.ok(msg.length > 0));
    store.set("k", 1);
    assert.equal(store.get("k"), 1);
    store.delete("k");
    assert.equal(store.get("k"), null);
  });
});

// ═══════════════════════════════
// 5) RateLimiter (Redis + fallback)
// ═══════════════════════════════
describe("RateLimiterAsync", () => {
  test("Redis path: يرفض بعد الحد (2)، ويسمح بعده", async () => {
    const l = createRateLimiterAsync({ limit: 2, windowMs: 60_000 }, new MemoryRedisBackend());
    assert.equal((await l.check("u:g")).allowed, true);
    assert.equal((await l.check("u:g")).allowed, true);
    assert.equal((await l.check("u:g")).allowed, false);
  });

  test("window expiry: بعد مرور النافذة يسمح مجددًا", async () => {
    let now = 1_000;
    const l = new RedisRateLimiter(new MemoryRedisBackend(() => now), { limit: 1, windowMs: 5_000 });
    assert.equal((await l.check("k", now)).allowed, true);
    assert.equal((await l.check("k", now)).allowed, false);
    now = 16_000; // بعد 3×window
    assert.equal((await l.check("k", now)).allowed, true);
  });

  test("fallback (بدون Redis): Memory limiter يعمل", async () => {
    const l = createRateLimiterAsync({ limit: 1, windowMs: 60_000 }, null);
    assert.equal((await l.check("k")).allowed, true);
    assert.equal((await l.check("k")).allowed, false);
  });
});

// ═══════════════════════════════
// 6) buildRedisServices — نقاط الدمج مع البيئة
// ═══════════════════════════════
describe("buildRedisServices", () => {
  test("backend محقون → isRedis=true ويعمل", async () => {
    const s = buildRedisServices({ backend: new MemoryRedisBackend() });
    assert.equal(s.isRedis, true);
    await s.counter.increment("x", 5_000);
    assert.equal(await s.counter.get("x"), 1);
  });

  test("بدون REDIS_URL → fallback بلا أخطاء ووظيفة سليمة", async () => {
    const original = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      const s = buildRedisServices();
      assert.equal(s.isRedis, false);
      await s.counter.increment("y", 5_000);
      assert.equal(await s.counter.get("y"), 1);
    } finally {
      if (original !== undefined) process.env.REDIS_URL = original;
    }
  });

  test("Namespace convention تبدأ بـ thez:", () => {
    assert.ok(nsKey(NS.cooldown, "x").startsWith("thez:"));
    assert.ok(nsKey(NS.ratelimit, "x").startsWith("thez:"));
    assert.ok(NS.spam.startsWith("thez:"));
    assert.ok(NS.raid.startsWith("thez:"));
    assert.ok(NS.cache.startsWith("thez:"));
  });
});

// ═══════════════════════════════
// 7) تكامل اختياري — فقط إذا كان Redis حقيقيًا معرّفًا في البيئة
// (لا ندّعي اجتيازه إن لم يعمل Redis فعليًا)
// ═══════════════════════════════
describe("Redis integration (اختياري)", () => {
  const integration = process.env.REDIS_URL?.trim() && process.env.REDIS_TEST_INTEGRATION === "1";

  test(
    "ioredis حقيقي: set/get/incr/expiry",
    { skip: !integration },
    async () => {
      const Redis = require("ioredis");
      const { RedisBackendRedis } = require("../shared/dist/redis/backend.js");
      const client = new Redis(process.env.REDIS_URL);
      const backend = new RedisBackendRedis(client);
      try {
        const key = `thez:test:${Date.now()}`;
        await backend.set(key, "v", 5_000);
        assert.equal(await backend.get(key), "v");
        assert.ok((await backend.incr(`${key}:c`, 5_000)) >= 1);
        assert.ok(await backend.ping());
        await client.del(key, `${key}:c`);
      } finally {
        client.disconnect();
      }
    }
  );
});