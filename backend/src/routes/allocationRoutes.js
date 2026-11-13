
const express = require("express");
const router = express.Router();

const { createAllocation } = require("../controllers/allocationController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.post(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    createAllocation
);

module.exports = router;
