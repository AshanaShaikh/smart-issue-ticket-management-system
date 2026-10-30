const userRoutes = require("./routes/userRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const worker = require("./aiAnalysisWorker");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
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
    // Start the background AI analysis worker after the server is listening.
    // NOTE: Restarting the server will interrupt any in-flight Gemini calls.
    // Jobs are recovered to 'pending' state on startup so they are retried automatically.
    worker.start();
});