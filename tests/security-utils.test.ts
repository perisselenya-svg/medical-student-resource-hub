import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RateLimiter } from "@/lib/utils/rate-limit";
import { slugify } from "@/lib/utils";
import { assertValidKey, generateStorageKey } from "@/lib/files/storage/keys";
import { parseMaterialQueryLenient } from "@/lib/validation/material";

describe("RateLimiter", () => {
  it("blocks after max hits within the window and resets afterwards", () => {
    const limiter = new RateLimiter(3, 60_000);
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) limiter.hit("k", t0);
    assert.ok(limiter.retryAfter("k", t0 + 1000) > 0);
    assert.equal(limiter.retryAfter("k", t0 + 61_000), 0);
    limiter.reset("k");
    assert.equal(limiter.retryAfter("k", t0), 0);
  });
});

describe("storage keys", () => {
  it("generates keys that pass validation", () => {
    assert.doesNotThrow(() => assertValidKey(generateStorageKey(".pdf")));
  });
  it("rejects traversal and malformed keys", () => {
    for (const bad of ["../etc/passwd", "/abs/path.pdf", "2026/10/../../x.pdf", "2026/10/not-a-uuid.pdf", ""]) {
      assert.throws(() => assertValidKey(bad), /Invalid storage key/);
    }
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    assert.equal(slugify("Café — Renal Physiology (Year 2)"), "cafe-renal-physiology-year-2");
    assert.equal(slugify("***"), "");
  });
});

describe("parseMaterialQueryLenient", () => {
  it("drops invalid params instead of failing", () => {
    const q = parseMaterialQueryLenient({ page: "-5", type: "exe", tag: ["cardiology", "Bad Tag!"], q: "heart" });
    assert.equal(q.page, 1);
    assert.deepEqual(q.type, []);
    assert.equal(q.q, "heart");
  });
  it("accepts repeated and comma-separated arrays", () => {
    const q = parseMaterialQueryLenient({ tag: ["renal,ecg"], type: ["pdf", "image"] });
    assert.deepEqual(q.tag, ["renal", "ecg"]);
    assert.deepEqual(q.type, ["pdf", "image"]);
  });
});

describe("quiz validation", () => {
  it("requires a marked correct answer within the options", async () => {
    const { questionSchema, quizCreateSchema } = await import("@/lib/validation/quiz");
    const base = { questionText: "Which valve?", explanation: "", options: [{ optionText: "A" }, { optionText: "B" }] };
    assert.equal(questionSchema.safeParse({ ...base, correctIndex: 1 }).success, true);
    assert.equal(questionSchema.safeParse({ ...base, correctIndex: 2 }).success, false);
    assert.equal(questionSchema.safeParse({ ...base, options: [{ optionText: "A" }], correctIndex: 0 }).success, false);
    // A quiz cannot be published without questions.
    assert.equal(quizCreateSchema.safeParse({ title: "Quiz", categoryId: "abc", isPublished: true, questions: [] }).success, false);
  });
});
