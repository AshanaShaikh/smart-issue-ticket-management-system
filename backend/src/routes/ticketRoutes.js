const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
// Create a new ticket
router.post("/", authenticateToken, async (req, res) => {
    try {
        //required fields - priority is optional, default to "Medium"
        const { title, description, category, priority } = req.body;
        const createdBy = req.user.id;
        if (!title || !description || !category) {
            return res.status(400).json({
            message: "Title, description and category are required"
            });
        }
        //validate category
        const allowedCategories = [
        "Network",
        "Hardware",
        "Software",
        "Account",
        "Access",
        "Cleaning",
        "Lost and Found"
        ];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }
        //Validate Priority (if provided)
        const allowedPriorities = [
        "Low",
        "Medium",
        "High",
        "Critical"
        ];

        if (priority && !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid priority"
            });
        }
        const ticketPriority = priority || "Medium";
        const newTicket = await pool.query(
            `INSERT INTO tickets
            (title, description, category, priority, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [title, description, category, ticketPriority, createdBy]
        );

        res.status(201).json({
            message: "Ticket created successfully",
            ticket: newTicket.rows[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

//Role Based Authentication
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let tickets;
        //Admin - All tickets
        if (role === "Admin") {
            tickets = await pool.query(
                "SELECT * FROM tickets ORDER BY created_at DESC"
            );
        }
        //User - Tickets created by the user
        else if (role === "User") {
            tickets = await pool.query(
                "SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC",
                [userId]
            );    
        } 
        //Agent - Roles assigned to the Agent
        else if (role === "Agent") { 
            tickets = await pool.query(
                "SELECT * FROM tickets WHERE assigned_to = $1 ORDER BY created_at DESC",
                [userId]
            );
        } 
        //Invalid role - Access denied
        else {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        res.status(200).json({
        tickets: tickets.rows
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});
module.exports = router;