
const express = require("express");
const router = express.Router();

const {
    getAllRequests,
    getRequestById,
    createRequest,
    recalculatePriority,
    getRequestRanking
} = require("../controllers/requestController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);

// Put /ranking before /:id to avoid route conflicts.
router.get(
    "/ranking",
    authorizeRoles("ADMIN", "COORDINATOR"),
    getRequestRanking
);

router.get("/", getAllRequests);

router.get("/:id", getRequestById);

router.post(
    "/",
    authorizeRoles("ADMIN", "COORDINATOR"),
    createRequest
);

router.patch(
    "/:id/priority",
    authorizeRoles("ADMIN", "COORDINATOR"),
    recalculatePriority
);

module.exports = router;
