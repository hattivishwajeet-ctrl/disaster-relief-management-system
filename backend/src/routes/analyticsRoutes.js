
const express = require("express");
const router = express.Router();

const {
    getDashboardSummary
} = require("../controllers/analyticsController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get(
    "/dashboard",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getDashboardSummary
);

module.exports = router;
