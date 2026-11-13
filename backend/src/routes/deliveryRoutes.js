
const express = require("express");
const router = express.Router();

const {
    updateDeliveryStatus,
    getAllDeliveries,
    getDeliveryById
} = require("../controllers/deliveryController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get("/", getAllDeliveries);

router.get("/:id", getDeliveryById);

router.patch(
    "/:id/status",
    authorizeRoles("ADMIN", "COORDINATOR"),
    updateDeliveryStatus
);

module.exports = router;
