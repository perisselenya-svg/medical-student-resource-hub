/**
 * Create an additional ADMIN account, or reset an existing admin's password.
 * (The first admin is normally created by the seed from SEED_ADMIN_* variables.)
 *
 *   npm run admin:create -- --email you@example.org [--name "Dr Smith"]
 *
 * The password is read from the ADMIN_PASSWORD environment variable if set,
 * otherwise prompted for interactively (input hidden). It is never accepted
 * as a command-line argument, because arguments leak into shell history and
 * process listings.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { newPasswordSchema } from "@/lib/validation/auth";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Suppress echo of typed characters.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });
  const email = z.email().parse(values.email?.trim().toLowerCase());
  const role = "ADMIN" as const;

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (!process.stdin.isTTY) throw new Error("No TTY: set ADMIN_PASSWORD in the environment instead.");
    password = await promptHidden("Password (min 12 chars, upper/lower/digit): ");
    const confirm = await promptHidden("Confirm password: ");
    if (password !== confirm) throw new Error("Passwords do not match");
  }
  const check = newPasswordSchema.safeParse(password);
  if (!check.success) throw new Error(check.error.issues[0]?.message ?? "Weak password");

  const passwordHash = await hashPassword(password);
  const existing = await db().user.findUnique({ where: { email } });
  if (existing) {
    await db().user.update({ where: { email }, data: { passwordHash, role, ...(values.name ? { name: values.name } : {}) } });
    console.log(`✔ Updated ${email} (password reset)`);
  } else {
    await db().user.create({ data: { email, name: values.name ?? null, role, passwordHash } });
    console.log(`✔ Created admin ${email}`);
  }
}

main()
  .then(() => db().$disconnect())
  .catch(async (error) => {
    console.error("✘", error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") : error instanceof Error ? error.message : error);
    await db().$disconnect();
    process.exit(1);
  });
