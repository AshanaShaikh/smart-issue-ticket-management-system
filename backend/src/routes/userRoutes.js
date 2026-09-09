const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, user_type } = req.body;

        // Check required fields
        if (!name || !email || !password || !user_type) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Validate email format
        if (!email.includes("@")) {
            return res.status(400).json({
                message: "Please enter a valid email"
            });
        }

        //Password validation
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        //Checking existing email in the database
        const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
        `INSERT INTO users (name, email, password_hash, user_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, user_type, role, created_at`,
        [name, email, passwordHash, user_type]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: newUser.rows[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;