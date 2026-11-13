
const express = require("express");
const router = express.Router();

const {
    getAllDisasters,
    getDisasterById,
    createDisaster,
    updateDisasterStatus
} = require("../controllers/disasterController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getAllDisasters
);

router.get(
    "/:id",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getDisasterById
);

router.post(
    "/",
    authorizeRoles("ADMIN"),
    createDisaster
);

router.patch(
    "/:id/status",
    authorizeRoles("ADMIN"),
    updateDisasterStatus
);

module.exports = router;
