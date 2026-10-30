/**
 * Secure seed.
 *
 *   npm run db:seed
 *
 * Creates exactly ONE admin user from environment variables (never hard-coded):
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optional)
 * plus the standard subject categories. Idempotent: an existing admin is never
 * modified (its password is not overwritten), categories are upserted.
 *
 * SEED_DEMO_CONTENT=true additionally creates sample materials and a sample
 * quiz in an EMPTY library (useful for local development and demos).
 */
import "dotenv/config";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { validateUpload } from "@/lib/files/validation";
import { createMaterial } from "@/lib/services/material.service";
import { createQuiz } from "@/lib/services/quiz.service";
import { findOrCreateTag } from "@/lib/services/taxonomy.service";
import { slugify } from "@/lib/utils";
import { newPasswordSchema } from "@/lib/validation/auth";
import { makeDiagramPng, makePdf } from "../scripts/lib/demo-files";

const SUBJECTS: Array<[string, string]> = [
  ["Anatomy", "Gross anatomy, neuroanatomy, embryology and surface anatomy."],
  ["Physiology", "How the body works: systems physiology and core mechanisms."],
  ["Biochemistry", "Metabolism, molecular biology, genetics and nutrition."],
  ["Pathology", "General and systemic pathology, histopathology."],
  ["Pharmacology", "Drug classes, mechanisms, pharmacokinetics and adverse effects."],
  ["Microbiology", "Bacteria, viruses, fungi, parasites and immunology basics."],
  ["Internal Medicine", "Clinical medicine across the major organ systems."],
  ["Surgery", "Surgical principles, peri-operative care and common procedures."],
  ["Pediatrics", "Child health, growth, development and paediatric conditions."],
  ["Obstetrics and Gynecology", "Pregnancy, childbirth and women's health."],
  ["Psychiatry", "Mental health assessment, disorders and treatment principles."],
  ["Clinical Skills", "History taking, examination routines and OSCE preparation."],
];

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("SEED_ADMIN_EMAIL is not a valid email address.");
  const check = newPasswordSchema.safeParse(password);
  if (!check.success) throw new Error(`SEED_ADMIN_PASSWORD: ${check.error.issues[0]?.message}`);

  const existing = await db().user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} already exists (left unchanged)`);
    return existing;
  }
  const admin = await db().user.create({
    data: { email, name: process.env.SEED_ADMIN_NAME?.trim() || "Administrator", role: "ADMIN", passwordHash: await hashPassword(password) },
  });
  console.log(`✔ Created admin ${email}`);
  return admin;
}

async function seedCategories() {
  for (const [index, [name, description]] of SUBJECTS.entries()) {
    const slug = slugify(name);
    await db().category.upsert({ where: { slug }, update: {}, create: { name, slug, description, displayOrder: (index + 1) * 10 } });
  }
  console.log(`✔ ${SUBJECTS.length} subject categories ready`);
}

async function seedDemoContent(adminId: string) {
  if ((await db().material.count()) > 0 || (await db().quiz.count()) > 0) {
    console.log("• Library not empty; skipping demo content");
    return;
  }
  const admin = await db().user.findUniqueOrThrow({ where: { id: adminId }, select: { id: true, email: true, name: true, role: true } });
  const category = async (name: string) => (await db().category.findUniqueOrThrow({ where: { slug: slugify(name) } })).id;
  const tag = async (name: string) => (await findOrCreateTag(name, adminId)).tag.id;
  const md = (s: string) => Buffer.from(s.trim() + "\n", "utf8");

  const demos = [
    {
      title: "Cardiac Cycle — High-Yield Notes",
      description: "Phases of the cardiac cycle, pressure–volume loops and heart sounds on two pages.",
      category: "Physiology",
      tags: ["Cardiology", "High-yield"],
      featured: true,
      published: true,
      filename: "cardiac-cycle-notes.pdf",
      type: "application/pdf",
      data: makePdf("Cardiac Cycle - High-Yield Notes", [
        "# Phases",
        "1. Atrial systole: atria contract and top up ventricular filling.",
        "2. Isovolumetric contraction: all valves closed, pressure rises.",
        "3. Rapid ejection: aortic and pulmonary valves open.",
        "4. Reduced ejection: ventricular pressure begins to fall.",
        "5. Isovolumetric relaxation: all valves closed again.",
        "6. Rapid and reduced filling: AV valves open.",
        "# Heart sounds",
        "S1 - closure of the mitral and tricuspid valves (start of systole).",
        "S2 - closure of the aortic and pulmonary valves (start of diastole).",
        "# Pressure-volume loop",
        "Loop area approximates stroke work. Preload moves the right edge;",
        "afterload changes the height of the ejection phase.",
        ...Array.from({ length: 34 }, (_, i) => `Revision line ${i + 1}: review your lecture slides and textbook chapter.`),
      ]),
    },
    {
      title: "Brachial Plexus — Schematic Diagram",
      description:
        "Schematic of the brachial plexus: five roots (left, teal) merge into three trunks (centre), which divide into terminal branches (right, amber).",
      category: "Anatomy",
      tags: ["Upper limb", "High-yield"],
      featured: true,
      published: true,
      filename: "brachial-plexus.png",
      type: "image/png",
      data: makeDiagramPng(),
    },
    {
      title: "Cardiovascular Examination — OSCE Checklist",
      description: "Step-by-step examination routine for OSCE practice, from introduction to summary.",
      category: "Clinical Skills",
      tags: ["OSCE", "Cardiology"],
      featured: false,
      published: true,
      filename: "osce-cvs-exam.md",
      type: "text/markdown",
      data: md(`
# Cardiovascular Examination — OSCE Checklist

> Practice checklist. Follow your own school's marking scheme.

## Before you start
- Wash hands, introduce yourself, confirm patient identity
- Explain the examination and gain consent
- Position at 45°, adequately exposed, ask about pain

## Inspection and hands
- General inspection: breathlessness, cyanosis, pallor
- Hands: clubbing, splinter haemorrhages, capillary refill
- Radial pulse: rate and rhythm; radio-radial delay

## Praecordium
| Step | Look for |
| --- | --- |
| Inspect | Scars, visible pulsations |
| Palpate | Apex beat, heaves, thrills |
| Auscultate | All four areas, with manoeuvres |

## To complete
- Lung bases, sacral and ankle oedema
- Thank the patient and summarise findings
`),
    },
    {
      title: "Pharmacokinetics — Quick Reference",
      description: "Bioavailability, volume of distribution, clearance, half-life and steady state.",
      category: "Pharmacology",
      tags: ["Pharmacokinetics", "High-yield"],
      featured: false,
      published: true,
      filename: "pharmacokinetics.md",
      type: "text/markdown",
      data: md(`
# Pharmacokinetics — Quick Reference

| Term | Meaning |
| --- | --- |
| Bioavailability (F) | Fraction of a dose reaching the systemic circulation unchanged |
| Volume of distribution (Vd) | Apparent volume a drug distributes into |
| Clearance (CL) | Volume of plasma cleared of drug per unit time |
| Half-life (t½) | Time for plasma concentration to fall by 50% |

- Steady state is reached after roughly **4–5 half-lives** of regular dosing.
- *First-order* kinetics: a constant fraction is eliminated per unit time.
- *Zero-order* kinetics: a constant amount is eliminated per unit time.
`),
    },
    {
      title: "Renal Physiology — Lecture Handout (draft)",
      description: "GFR, tubular transport and acid–base basics. Awaiting review.",
      category: "Physiology",
      tags: ["Renal"],
      featured: false,
      published: false,
      filename: "renal-physiology.pdf",
      type: "application/pdf",
      data: makePdf("Renal Physiology - Lecture Handout", ["# Glomerular filtration", "GFR depends on net filtration pressure and Kf."]),
    },
  ];

  for (const d of demos) {
    // Same validation path as real uploads: proves the generated bytes are well-formed.
    const file = await validateUpload(new File([new Uint8Array(d.data)], d.filename, { type: d.type }), env().maxUploadBytes);
    await createMaterial(
      {
        title: d.title,
        description: d.description,
        categoryId: await category(d.category),
        tagIds: await Promise.all(d.tags.map(tag)),
        isPublished: d.published,
        isFeatured: d.featured,
      },
      file,
      admin,
    );
    console.log(`✔ Demo material: ${d.title}`);
  }

  await createQuiz(
    {
      title: "Cardiovascular Physiology — Practice Quiz",
      description: "Five single-best-answer questions on the cardiac cycle and haemodynamics.",
      categoryId: await category("Physiology"),
      isPublished: true,
      questions: [
        {
          questionText: "During which phase of the cardiac cycle are all four heart valves closed while ventricular pressure rises?",
          options: [{ optionText: "Rapid ejection" }, { optionText: "Isovolumetric contraction" }, { optionText: "Atrial systole" }, { optionText: "Rapid filling" }],
          correctIndex: 1,
          explanation: "In isovolumetric contraction the ventricles contract against closed AV and semilunar valves, so pressure rises without a change in volume.",
        },
        {
          questionText: "The first heart sound (S1) is produced mainly by closure of which valves?",
          options: [{ optionText: "Aortic and pulmonary" }, { optionText: "Mitral and tricuspid" }, { optionText: "Aortic and mitral" }, { optionText: "Pulmonary and tricuspid" }],
          correctIndex: 1,
          explanation: "S1 marks the start of ventricular systole, when the atrioventricular (mitral and tricuspid) valves close.",
        },
        {
          questionText: "Cardiac output equals:",
          options: [
            { optionText: "Stroke volume × heart rate" },
            { optionText: "Mean arterial pressure × heart rate" },
            { optionText: "End-diastolic volume − end-systolic volume" },
            { optionText: "Stroke volume ÷ heart rate" },
          ],
          correctIndex: 0,
          explanation: "CO = SV × HR. End-diastolic minus end-systolic volume gives the stroke volume, not cardiac output.",
        },
        {
          questionText: "According to the Frank–Starling mechanism, increasing preload (within physiological limits) will:",
          options: [{ optionText: "Decrease stroke volume" }, { optionText: "Not change stroke volume" }, { optionText: "Increase stroke volume" }, { optionText: "Decrease heart rate" }],
          correctIndex: 2,
          explanation: "Greater end-diastolic stretch increases the force of contraction, so stroke volume rises.",
        },
        {
          questionText: "Physiological splitting of S2 is heard most clearly during:",
          options: [{ optionText: "Expiration" }, { optionText: "Inspiration" }, { optionText: "Breath-holding at end-expiration" }, { optionText: "The Valsalva strain phase" }],
          correctIndex: 1,
          explanation: "Inspiration increases venous return to the right heart, delaying pulmonary valve closure and widening the split.",
        },
      ],
    },
    adminId,
  );
  console.log("✔ Demo quiz: Cardiovascular Physiology — Practice Quiz");
}

async function main() {
  env(); // fail fast on missing configuration
  const admin = await seedAdmin();
  await seedCategories();
  if (process.env.SEED_DEMO_CONTENT === "true") await seedDemoContent(admin.id);
  else console.log("• Demo content skipped (set SEED_DEMO_CONTENT=true to add sample materials and a quiz)");
}

main()
  .then(() => db().$disconnect())
  .catch(async (error) => {
    console.error("✘ Seed failed:", error instanceof Error ? error.message : error);
    await db().$disconnect();
    process.exit(1);
  });
