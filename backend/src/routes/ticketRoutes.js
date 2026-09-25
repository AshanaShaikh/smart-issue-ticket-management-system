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

// Access ticket by valid userID
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const ticketResult = await pool.query(
        "SELECT * FROM tickets WHERE id = $1",
        [ticketId]
        );
        //Check if ticket exists
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
            message: "Ticket not found"
            });
        }
        const ticket = ticketResult.rows[0];
        //Ticket Ownership

        //User
        if (req.user.role === "User" && ticket.created_by !== req.user.id) {
            return res.status(403).json({
            message: "You are not authorized to view this ticket"
            });
        }
        //Agent
        if (req.user.role === "Agent" && ticket.assigned_to !== req.user.id) {
            return res.status(403).json({
            message: "You are not authorized to view this ticket"
            });
        }
        res.status(200).json({
            ticket
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Ticket Updation
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;
        //Ticket details
        const { title, description, category, priority, status, assigned_to } = req.body;
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }
        const ticket = ticketResult.rows[0];
        //User credentials
        if (req.user.role === "User" && ticket.created_by !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to update this ticket"
            });
        }
        if (req.user.role === "User" && ticket.status !== "Open") {
            return res.status(403).json({
                message: "Ticket cannot be edited once it is in progress or completed"
            });
        }
        if (req.user.role === "User") {
            if (status !== undefined || assigned_to !== undefined) {
                return res.status(403).json({
                    message: "Users are not authorized to update status or assignment"
                });
            }
        }

        //Agent credentials
        if (req.user.role === "Agent" && ticket.assigned_to !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to update this ticket"
            });
        }
        if (req.user.role === "Agent") {
            if (
                title !== undefined ||
                description !== undefined ||
                priority !== undefined ||
                assigned_to !== undefined
            ) {
                return res.status(403).json({
                    message: "Agents are only authorized to update status and category"
                });
            }
        }

        //Admin Permissions
        if (req.user.role === "Admin") {
            if (
                title !== undefined ||
                description !== undefined
            ) {
                return res.status(403).json({
                    message: "Admins are not authorized to update title or description"
                });
            }
        }

        //Update
        if (
            title === undefined &&
            description === undefined &&
            category === undefined &&
            priority === undefined &&
            status === undefined &&
            assigned_to === undefined
        ) {
            return res.status(400).json({
                message: "At least one field is required to update the ticket"
            });
        }

        //Ticket Status
        const validStatuses = [
            "Open",
            "In Progress",
            "Resolved",
            "Closed",
            "Reopened"
        ];

        if (status !== undefined && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        //Priority Validation
        const validPriorities = [
            "Low",
            "Medium",
            "High",
            "Critical"
        ];

        if (priority !== undefined && !validPriorities.includes(priority)) {
            return res.status(400).json({
                message: "Invalid priority"
            });
        }

        //Category Validation
        const validCategories = [
            "Network",
            "Hardware",
            "Software",
            "Account",
            "Access",
            "Cleaning",
            "Lost and Found"
        ];

        if (category !== undefined && !validCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }

        //Validate assigned_to
        if (assigned_to !== undefined && assigned_to !== null) {
            const assignedUserResult = await pool.query(
                "SELECT id, role FROM users WHERE id = $1",
                [assigned_to]
            );

            if (assignedUserResult.rows.length === 0) {
                return res.status(400).json({
                    message: "Assigned user does not exist"
                });
            }

            if (assignedUserResult.rows[0].role !== "Agent") {
                return res.status(400).json({
                    message: "Ticket can only be assigned to an Agent"
                });
            }
        }        

        const updateFields = [];
        const values = [];
        let parameterIndex = 1;
        const historyChanges = [];

        //Title handling
        if (title !== undefined) {
            if (title !== ticket.title) {
                historyChanges.push({
                    field: "title",
                    oldValue: ticket.title,
                    newValue: title
                });
            }
            updateFields.push(`title = $${parameterIndex}`);
            values.push(title);
            parameterIndex++;
        }

        //Description Handling
        if (description !== undefined) {
            if (description !== ticket.description) {
                historyChanges.push({
                    field: "description",
                    oldValue: ticket.description,
                    newValue: description
                });
            }
            updateFields.push(`description = $${parameterIndex}`);
            values.push(description);
            parameterIndex++;
        }

        //Category Handling
        if (category !== undefined) {
            if (category !== ticket.category) {
                historyChanges.push({
                    field: "category",
                    oldValue: ticket.category,
                    newValue: category
                });
            }
            updateFields.push(`category = $${parameterIndex}`);
            values.push(category);
            parameterIndex++;
        }

        //Priority Handling
        if (priority !== undefined) {
            if (priority !== ticket.priority) {
                historyChanges.push({
                    field: "priority",
                    oldValue: ticket.priority,
                    newValue: priority
                });
            }
            updateFields.push(`priority = $${parameterIndex}`);
            values.push(priority);
            parameterIndex++;
        }

        //Status Handling
        if (status !== undefined) {
            if (status !== ticket.status) {
                historyChanges.push({
                    field: "status",
                    oldValue: ticket.status,
                    newValue: status
                });
            }
            updateFields.push(`status = $${parameterIndex}`);
            values.push(status);
            parameterIndex++;
        }

        //Assigned_to Handling
        if (assigned_to !== undefined) {
            const currentAssigned = ticket.assigned_to !== null && ticket.assigned_to !== undefined ? String(ticket.assigned_to) : null;
            const newAssigned = assigned_to !== null && assigned_to !== undefined ? String(assigned_to) : null;

            if (currentAssigned !== newAssigned) {
                historyChanges.push({
                    field: "assigned_to",
                    oldValue: ticket.assigned_to,
                    newValue: assigned_to
                });
            }
            updateFields.push(`assigned_to = $${parameterIndex}`);
            values.push(assigned_to);
            parameterIndex++;
        }

        //Updated_at Handling
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(ticketId);

        //Update Ticket
        const updatedTicketResult = await pool.query(
            `UPDATE tickets
            SET ${updateFields.join(", ")}
            WHERE id = $${parameterIndex}
            RETURNING *`,
            values
        );

        // Record Ticket History
        for (const change of historyChanges) {
            await pool.query(
                `INSERT INTO ticket_history
                (ticket_id, field_changed, old_value, new_value, changed_by)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    ticketId,
                    change.field,
                    change.oldValue !== null && change.oldValue !== undefined ? String(change.oldValue) : null,
                    change.newValue !== null && change.newValue !== undefined ? String(change.newValue) : null,
                    req.user.id
                ]
            );
        }

        res.status(200).json({
            message: "Ticket updated successfully",
            ticket: updatedTicketResult.rows[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

//Adding New Comment
router.post("/:id/comments", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { comment } = req.body;

        // Validate comment
        if (!comment || comment.trim() === "") {
            return res.status(400).json({
                message: "Comment is required"
            });
        }

        // Check if ticket exists
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        // Check ticket access
        if (
            req.user.role === "User" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to comment on this ticket"
            });
        }

        if (
            req.user.role === "Agent" &&
            ticket.assigned_to !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to comment on this ticket"
            });
        }

        // Insert comment
        const commentResult = await pool.query(
            `INSERT INTO ticket_comments
            (ticket_id, user_id, comment)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [ticketId, req.user.id, comment.trim()]
        );

        res.status(201).json({
            message: "Comment added successfully",
            comment: commentResult.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Get Comments
router.get("/:id/comments", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // Check if ticket exists
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        // Check ticket access
        if (
            req.user.role === "User" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view comments on this ticket"
            });
        }

        if (
            req.user.role === "Agent" &&
            ticket.assigned_to !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view comments on this ticket"
            });
        }

        // Get comments
        const commentResult = await pool.query(
            `SELECT id, ticket_id, user_id, comment, created_at, updated_at
            FROM ticket_comments
            WHERE ticket_id = $1
            AND deleted_at IS NULL
            ORDER BY created_at ASC`,
            [ticketId]
        );

        res.status(200).json({
            ticket_id: ticketId,
            comments: commentResult.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Edit Comment
router.put("/comments/:id", authenticateToken, async (req, res) => {
    try {
        const commentId = req.params.id;
        const { comment } = req.body;

        if (!comment || comment.trim() === "") {
            return res.status(400).json({
                message: "Comment is required"
            });
        }

        const commentResult = await pool.query(
            `SELECT * FROM ticket_comments
            WHERE id = $1`,
            [commentId]
        );

        if (commentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const existingComment = commentResult.rows[0];

        if (existingComment.deleted_at !== null) {
            return res.status(400).json({
                message: "Deleted comments cannot be edited"
            });
        }

        if (existingComment.user_id !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to edit this comment"
            });
        }

        const updatedCommentResult = await pool.query(
            `UPDATE ticket_comments
            SET comment = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *`,
            [comment.trim(), commentId]
        );

        res.status(200).json({
            message: "Comment updated successfully",
            comment: updatedCommentResult.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Delete Comment
router.delete("/comments/:id", authenticateToken, async (req, res) => {
    try {
        const commentId = req.params.id;

        const commentResult = await pool.query(
            `SELECT * FROM ticket_comments
            WHERE id = $1`,
            [commentId]
        );

        if (commentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const existingComment = commentResult.rows[0];

        if (existingComment.deleted_at !== null) {
            return res.status(400).json({
                message: "Comment is already deleted"
            });
        }

        if (existingComment.user_id !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to delete this comment"
            });
        }

        const deletedCommentResult = await pool.query(
            `UPDATE ticket_comments
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *`,
            [commentId]
        );

        res.status(200).json({
            message: "Comment deleted successfully",
            comment: deletedCommentResult.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Get Ticket History
router.get("/:id/history", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // Check if ticket exists
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        // Check ticket access
        if (
            req.user.role === "User" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view history for this ticket"
            });
        }

        if (
            req.user.role === "Agent" &&
            ticket.assigned_to !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view history for this ticket"
            });
        }

        if (
            req.user.role !== "Admin" &&
            req.user.role !== "Agent" &&
            req.user.role !== "User"
        ) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Query ticket history
        const historyResult = await pool.query(
            `SELECT id, ticket_id, field_changed, old_value, new_value, changed_by, changed_at
            FROM ticket_history
            WHERE ticket_id = $1
            ORDER BY changed_at ASC`,
            [ticketId]
        );

        res.status(200).json({
            ticket_id: ticketId,
            history: historyResult.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Create AI Analysis for a ticket (Mock)
router.post("/:id/ai-analysis", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // Check if ticket exists
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        // Check ticket access
        if (
            req.user.role === "User" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to analyze this ticket"
            });
        }

        if (
            req.user.role === "Agent" &&
            ticket.assigned_to !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to analyze this ticket"
            });
        }

        if (
            req.user.role !== "Admin" &&
            req.user.role !== "Agent" &&
            req.user.role !== "User"
        ) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Mock / Temporary AI Analysis logic
        let suggested_priority = "Medium";
        let confidence_score = 0.85;
        let analysis = "Automated preliminary analysis: Issue classified as Medium priority based on ticket description and category.";

        const content = `${ticket.title || ""} ${ticket.description || ""}`.toLowerCase();
        if (content.includes("critical") || content.includes("crash") || content.includes("urgent") || content.includes("outage")) {
            suggested_priority = "Critical";
            confidence_score = 0.95;
            analysis = "Mock AI Analysis: Critical keywords detected in ticket content. High urgency suggested.";
        } else if (content.includes("error") || content.includes("fail") || content.includes("bug")) {
            suggested_priority = "High";
            confidence_score = 0.88;
            analysis = "Mock AI Analysis: Error/failure patterns detected. Prompt resolution recommended.";
        } else if (content.includes("help") || content.includes("inquiry") || content.includes("request")) {
            suggested_priority = "Low";
            confidence_score = 0.80;
            analysis = "Mock AI Analysis: Standard inquiry or service request detected. Low urgency suggested.";
        }

        // Insert AI analysis without modifying tickets.priority
        const insertResult = await pool.query(
            `INSERT INTO ai_analysis
            (ticket_id, suggested_priority, confidence_score, analysis)
            VALUES ($1, $2, $3, $4)
            RETURNING id, ticket_id, suggested_priority, confidence_score, analysis, created_at`,
            [ticketId, suggested_priority, confidence_score, analysis]
        );

        res.status(201).json({
            message: "AI analysis created successfully",
            analysis: insertResult.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Get AI Analyses for a ticket
router.get("/:id/ai-analysis", authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;

        // Check if ticket exists
        const ticketResult = await pool.query(
            "SELECT * FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found"
            });
        }

        const ticket = ticketResult.rows[0];

        // Check ticket access
        if (
            req.user.role === "User" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view AI analysis for this ticket"
            });
        }

        if (
            req.user.role === "Agent" &&
            ticket.assigned_to !== req.user.id
        ) {
            return res.status(403).json({
                message: "You are not authorized to view AI analysis for this ticket"
            });
        }

        if (
            req.user.role !== "Admin" &&
            req.user.role !== "Agent" &&
            req.user.role !== "User"
        ) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // Query all AI analyses for the ticket ordered by created_at DESC
        const analysisResult = await pool.query(
            `SELECT id, ticket_id, suggested_priority, confidence_score, analysis, created_at
            FROM ai_analysis
            WHERE ticket_id = $1
            ORDER BY created_at DESC`,
            [ticketId]
        );

        res.status(200).json({
            ticket_id: ticketId,
            analyses: analysisResult.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;