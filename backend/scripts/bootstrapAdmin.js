/**
 * bootstrapAdmin.js — One-time local provisioning script for the initial SmartDesk Admin account.
 *
 * Security properties:
 * - Prompts for password interactively at execution time (masked with asterisks on stdout).
 * - Passwords are NEVER passed as command-line arguments (preventing command history leaks).
 * - Hashes passwords with bcrypt (10 rounds) before inserting into PostgreSQL.
 * - Enforces database constraint: user_type must be 'Student', 'Faculty', or 'Staff'.
 * - Enforces role = 'Admin'.
 * - Refuses to overwrite existing accounts (fails cleanly if the email is already registered).
 * - Never prints or logs plaintext passwords or password hashes.
 *
 * Usage:
 *   node scripts/bootstrapAdmin.js
 *   or: npm run bootstrap:admin
 */

const path = require("path");
// Load backend/.env explicitly by path (not CWD-relative) so this script
// can be run safely from any working directory.
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const readline = require("readline");
const bcrypt = require("bcrypt");
const pool = require("../src/db");

const ALLOWED_USER_TYPES = ["Student", "Faculty", "Staff"];

/**
 * Standard question prompt with trim.
 */
function askQuestion(rl, promptText) {
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      resolve(ans.trim());
    });
  });
}

/**
 * Hidden/masked password prompt.
 * Characters typed are masked with '*' to prevent shoulder-surfing and terminal logging.
 */
function askHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let muted = false;
    const oldWrite = rl._writeToOutput;
    rl._writeToOutput = function _writeToOutput(str) {
      if (muted) {
        if (str.includes("\r") || str.includes("\n")) {
          oldWrite.call(rl, str);
        } else {
          oldWrite.call(rl, "*");
        }
      } else {
        oldWrite.call(rl, str);
      }
    };

    process.stdout.write(query);
    muted = true;

    rl.question("", (password) => {
      rl.close();
      console.log(""); // line break after Enter
      resolve(password.trim());
    });
  });
}

async function bootstrapAdmin() {
  console.log("\n=======================================================");
  console.log("       SmartDesk Initial Admin Account Bootstrap       ");
  console.log("=======================================================\n");

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. Full Name
    let name = process.env.ADMIN_NAME;
    if (!name) {
      name = await askQuestion(rl, "1. Admin Full Name [System Administrator]: ");
      if (!name) name = "System Administrator";
    }

    // 2. Email Address
    let email = process.env.ADMIN_EMAIL;
    if (!email) {
      while (!email) {
        const input = await askQuestion(rl, "2. Admin Email Address: ");
        if (!input || !input.includes("@") || !input.includes(".")) {
          console.log("   --> Error: Please enter a valid email address (e.g. admin@smartdesk.edu)");
          continue;
        }
        email = input.toLowerCase();
      }
    } else {
      email = email.toLowerCase().trim();
    }

    // 3. User Type (Academic Affiliation)
    let userType = process.env.ADMIN_USER_TYPE;
    if (!userType) {
      while (!userType) {
        const input = await askQuestion(rl, "3. User Type (Student / Faculty / Staff) [Staff]: ");
        const selected = input || "Staff";
        const matched = ALLOWED_USER_TYPES.find(
          (t) => t.toLowerCase() === selected.toLowerCase()
        );
        if (!matched) {
          console.log(`   --> Error: Invalid user type. Must be one of: ${ALLOWED_USER_TYPES.join(", ")}`);
          continue;
        }
        userType = matched;
      }
    }

    // Close standard rl before masked password prompts
    rl.close();

    // 4. Password (Masked entry)
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      while (!password) {
        const p1 = await askHidden("4. Enter Admin Password (min 6 characters, masked): ");
        if (!p1 || p1.length < 6) {
          console.log("   --> Error: Password must be at least 6 characters long.");
          continue;
        }
        const p2 = await askHidden("   Confirm Admin Password: ");
        if (p1 !== p2) {
          console.log("   --> Error: Passwords do not match. Please try again.");
          continue;
        }
        password = p1;
      }
    } else if (password.length < 6) {
      throw new Error("ADMIN_PASSWORD must be at least 6 characters long.");
    }

    console.log("\n--> Validating against existing database records...");

    // 5. Refuse to overwrite existing account
    const existing = await pool.query(
      "SELECT id, name, email, user_type, role FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      console.error(
        `\n[ERROR] Account with email "${email}" already exists (ID: #${existingUser.id}, Current Role: "${existingUser.role}").`
      );
      console.error("[REFUSED] The bootstrap script will NOT overwrite existing accounts.\n");
      process.exit(1);
    }

    // 6. Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // 7. Insert the new Admin into PostgreSQL
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, user_type, role)
       VALUES ($1, $2, $3, $4, 'Admin')
       RETURNING id, name, email, user_type, role, created_at;`,
      [name, email, passwordHash, userType]
    );

    const created = insertResult.rows[0];

    console.log("\n=======================================================");
    console.log("     SUCCESS: Admin Account Provisioned Securely       ");
    console.log("=======================================================");
    console.log(`  User ID    : #${created.id}`);
    console.log(`  Name       : ${created.name}`);
    console.log(`  Email      : ${created.email}`);
    console.log(`  User Type  : ${created.user_type}`);
    console.log(`  Role       : ${created.role}`);
    console.log(`  Created At : ${created.created_at}`);
    console.log("=======================================================");
    console.log("  NOTE: Passwords are not printed. You can now log in  ");
    console.log("  at the /login screen using this email and password.  ");
    console.log("=======================================================\n");

  } catch (err) {
    console.error("\n[FATAL ERROR] Admin bootstrap failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

bootstrapAdmin();
