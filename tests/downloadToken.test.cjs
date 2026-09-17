const { test, describe } = require("node:test");
const assert = require("node:assert");

process.env.DOWNLOADER_SECRET = "test-secret-value";

const {
  createDownloadToken,
  verifyDownloadToken,
  getDownloadSecret,
  isDownloadSigningEnabled,
  fileTokenId
} = require("../shared/dist/index.js");

describe("downloadToken: توقيع روابط التحميل", () => {
  test("إنشاء توقيع والتحقق منه ينجح لنفس النوع والمعرّف", () => {
    const token = createDownloadToken("url", "https://x.com/a/status/1");
    assert.ok(token, "التوقيع يجب أن يُنشأ عند وجود سر");
    assert.ok(verifyDownloadToken("url", "https://x.com/a/status/1", token));
  });

  test("توقيع الرابط لا يصلح لملف آخر (فصل الأنواع)", () => {
    const token = createDownloadToken("url", "abc");
    assert.equal(verifyDownloadToken("file", "abc", token), false);
    assert.equal(verifyDownloadToken("url", "different", token), false);
  });

  test("التلاعب بالمعرّف يُبطل التوقيع", () => {
    const token = createDownloadToken("url", "https://tiktok.com/@a/video/1");
    assert.equal(verifyDownloadToken("url", "https://tiktok.com/@a/video/2", token), false);
  });

  test("التلاعب بالتوقيع نفسه يُبطل التحقق", () => {
    const token = createDownloadToken("url", "payload");
    const [expiresAt, signature] = token.split(".");
    const tampered = `${expiresAt}.${signature.slice(0, -2)}xx`;
    assert.equal(verifyDownloadToken("url", "payload", tampered), false);
  });

  test("التوقيع المنتهي يُرفض", () => {
    const token = createDownloadToken("url", "payload", -1000);
    assert.ok(token, "يجب أن يُنشأ التوقيع");
    assert.equal(verifyDownloadToken("url", "payload", token), false);
  });

  test("رموز غير صالحة (فارغة/بصيغة خاطئة) تُرفض بأمان", () => {
    assert.equal(verifyDownloadToken("url", "payload", null), false);
    assert.equal(verifyDownloadToken("url", "payload", ""), false);
    assert.equal(verifyDownloadToken("url", "payload", "no-dot"), false);
    assert.equal(verifyDownloadToken("url", "payload", "abc.def"), false);
  });

  test("fileTokenId يجمع معرّف المهمة واسم الملف", () => {
    assert.equal(fileTokenId("abcd1234", "the-z-tiktok-abcd1234.mp4"), "abcd1234/the-z-tiktok-abcd1234.mp4");
    const token = createDownloadToken("file", fileTokenId("abcd1234", "the-z-tiktok-abcd1234.mp4"));
    assert.ok(verifyDownloadToken("file", fileTokenId("abcd1234", "the-z-tiktok-abcd1234.mp4"), token));
  });

  test("بدون سر: تُعطَّل التوقيعات (فشل آمن) والتحقق يفشل دائمًا", () => {
    const savedSecret = process.env.DOWNLOADER_SECRET;
    const savedNextAuth = process.env.NEXTAUTH_SECRET;
    const savedClientSecret = process.env.DISCORD_CLIENT_SECRET;
    delete process.env.DOWNLOADER_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.DISCORD_CLIENT_SECRET;

    assert.equal(getDownloadSecret(), "");
    assert.equal(isDownloadSigningEnabled(), false);
    assert.equal(createDownloadToken("url", "x"), null);
    assert.equal(verifyDownloadToken("url", "x", "anything"), false);

    process.env.DOWNLOADER_SECRET = savedSecret;
    if (savedNextAuth !== undefined) process.env.NEXTAUTH_SECRET = savedNextAuth;
    if (savedClientSecret !== undefined) process.env.DISCORD_CLIENT_SECRET = savedClientSecret;
  });

  test("الرجوع إلى NEXTAUTH_SECRET عند غياب DOWNLOADER_SECRET", () => {
    const savedSecret = process.env.DOWNLOADER_SECRET;
    delete process.env.DOWNLOADER_SECRET;
    process.env.NEXTAUTH_SECRET = "nextauth-secret";

    const token = createDownloadToken("url", "y");
    assert.ok(token);
    assert.ok(verifyDownloadToken("url", "y", token));

    process.env.DOWNLOADER_SECRET = savedSecret;
    delete process.env.NEXTAUTH_SECRET;
  });
});
