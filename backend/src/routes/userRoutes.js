const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { requireAdmin } = authenticateToken;

const router = express.Router();

// Allowed database constraint values
const ALLOWED_USER_TYPES = ["Student", "Faculty", "Staff"];
const ALLOWED_ROLES = ["User", "Agent", "Admin"];

// ─── 1. Public Registration Route ───────────────────────────────────────────
// Restricted strictly to the 'User' role. Ignores any requested role input.
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, user_type } = req.body;

        // Check required fields
        if (!name || !email || !password || !user_type) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Validate user_type against exact database check constraint
        if (!ALLOWED_USER_TYPES.includes(user_type)) {
            return res.status(400).json({
                message: "Invalid user type. Allowed values are Student, Faculty, Staff"
            });
        }

        // Validate email format
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail.includes("@")) {
            return res.status(400).json({
                message: "Please enter a valid email"
            });
        }

        // Password validation (min 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        // Checking existing email in the database
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
            [trimmedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash the password with bcrypt
        const passwordHash = await bcrypt.hash(password, 10);

        // Security: Public registration ALWAYS assigns role = 'User'.
        // Any 'role' field passed in req.body is intentionally ignored.
        const newUser = await pool.query(
            `INSERT INTO users (name, email, password_hash, user_type, role)
             VALUES ($1, $2, $3, $4, 'User')
             RETURNING id, name, email, user_type, role, created_at`,
            [name.trim(), trimmedEmail, passwordHash, user_type]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: newUser.rows[0]
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ─── 2. Login Route ──────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        const userResult = await pool.query(
            "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
            [trimmedEmail]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = userResult.rows[0];

        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate JWT token containing id, email, and verified role
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ─── 3. Protected Profile Route ──────────────────────────────────────────────
router.get("/profile", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Protected route accessed successfully",
        user: req.user
    });
});

// ─── 4. List All Users (Admin Only) ──────────────────────────────────────────
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const usersResult = await pool.query(
            `SELECT id, name, email, user_type, role, created_at, updated_at
             FROM users
             ORDER BY id ASC`
        );

        res.status(200).json({
            users: usersResult.rows
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ─── 5. Provision User / Agent (Admin Only) ─────────────────────────────────
// Allows an Admin to provision a new Agent, Admin, or User account directly.
router.post("/provision", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, user_type, role } = req.body;

        if (!name || !email || !password || !user_type) {
            return res.status(400).json({
                message: "Name, email, password, and user_type are required"
            });
        }

        // Validate user_type against database constraints
        if (!ALLOWED_USER_TYPES.includes(user_type)) {
            return res.status(400).json({
                message: "Invalid user type. Allowed values are Student, Faculty, Staff"
            });
        }

        // Validate role against database constraints (defaults to 'Agent')
        const targetRole = role || "Agent";
        if (!ALLOWED_ROLES.includes(targetRole)) {
            return res.status(400).json({
                message: "Invalid role. Allowed values are User, Agent, Admin"
            });
        }

        // Validate email
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail.includes("@")) {
            return res.status(400).json({
                message: "Please enter a valid email"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if email already registered
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
            [trimmedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `INSERT INTO users (name, email, password_hash, user_type, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, email, user_type, role, created_at`,
            [name.trim(), trimmedEmail, passwordHash, user_type, targetRole]
        );

        res.status(201).json({
            message: `${targetRole} account provisioned successfully`,
            user: newUser.rows[0]
        });
    } catch (error) {
        console.error("Provisioning error:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ─── 6. Promote / Update User Role (Admin Only) ─────────────────────────────
router.put("/:id/role", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const targetId = req.params.id;
        const { role } = req.body;

        if (!role || !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Invalid role. Allowed values are User, Agent, Admin"
            });
        }

        // Prevent self-demotion lockout
        if (String(req.user.id) === String(targetId) && role !== "Admin") {
            return res.status(400).json({
                message: "Admins cannot demote their own account to prevent lockout"
            });
        }

        const userResult = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [targetId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const updatedUser = await pool.query(
            `UPDATE users
             SET role = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, name, email, user_type, role, updated_at`,
            [role, targetId]
        );

        res.status(200).json({
            message: `User role updated to ${role} successfully`,
            user: updatedUser.rows[0]
        });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ─── 7. List Active Agents (Authenticated Users) ────────────────────────────
// Helpful for ticket assignment dropdowns in dashboard and workspace
router.get("/agents", authenticateToken, async (req, res) => {
    try {
        const agentsResult = await pool.query(
            `SELECT id, name, email, user_type, role
             FROM users
             WHERE role = 'Agent'
             ORDER BY name ASC`
        );

        res.status(200).json({
            agents: agentsResult.rows
        });
    } catch (error) {
        console.error("Error fetching agents:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;