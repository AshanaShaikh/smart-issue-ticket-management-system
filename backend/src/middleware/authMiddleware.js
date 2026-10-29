const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(403).json({
            message: "Invalid or expired token"
        });
    }  
};

/**
 * Role-based authorization middleware.
 * Usage: router.get('/admin-only', authenticateToken, requireRole('Admin'), handler)
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied: insufficient permissions"
            });
        }
        next();
    };
};

const requireAdmin = requireRole("Admin");

// Support both commonjs default function export and named properties
authenticateToken.authenticateToken = authenticateToken;
authenticateToken.requireRole = requireRole;
authenticateToken.requireAdmin = requireAdmin;

module.exports = authenticateToken;