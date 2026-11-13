
const express = require("express");
const router = express.Router();

const {
    getAllInventory,
    getInventoryById
} = require("../controllers/inventoryController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getAllInventory
);

router.get(
    "/:id",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getInventoryById
);

module.exports = router;
