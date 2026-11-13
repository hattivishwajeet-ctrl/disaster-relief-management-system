
const express = require("express");
const router = express.Router();

const { getProfile } = require("../controllers/userController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get("/me", authenticateToken, getProfile);

// Temporary RBAC verification endpoint
router.get(
    "/admin-check",
    authenticateToken,
    authorizeRoles("ADMIN"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Administrator access granted"
        });
    }
);

module.exports = router;
