
const express = require("express");
const router = express.Router();

const {
    getAllCamps,
    getCampById,
    createCamp,
    updateCampOccupancy,
    updateCampStatus
} = require("../controllers/campController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get("/", authorizeRoles("ADMIN", "COORDINATOR"), getAllCamps);
router.get("/:id", authorizeRoles("ADMIN", "COORDINATOR"), getCampById);

router.post("/", authorizeRoles("ADMIN", "COORDINATOR"), createCamp);

router.patch(
    "/:id/occupancy",
    authorizeRoles("ADMIN", "COORDINATOR"),
    updateCampOccupancy
);

router.patch(
    "/:id/status",
    authorizeRoles("ADMIN", "COORDINATOR"),
    updateCampStatus
);

module.exports = router;
