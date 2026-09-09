const userRoutes = require("./routes/userRoutes");
const express = require("express");
const pool = require("./db");

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);
pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Database connected successfully:", result.rows[0]);
    }
});

const PORT = 5000;

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Smart Issue & Ticket Management System API is running 🚀"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});