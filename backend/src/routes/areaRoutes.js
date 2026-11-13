
const express = require("express");
const router = express.Router();

const {
    getAllAreas,
    getAreasByDisaster,
    createArea
} = require("../controllers/areaController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getAllAreas
);

router.get(
    "/disaster/:disasterId",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getAreasByDisaster
);

router.post(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    createArea
);

module.exports = router;
