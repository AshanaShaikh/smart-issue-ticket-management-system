const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const router = express.Router();

//Registration route
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

//Login route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
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

        res.status(200).json({
            message: "Login successful",
            user: {
            id: user.id,
            name: user.name,
            email: user.email,
            user_type: user.user_type,
            role: user.role
            }
        });
      
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;