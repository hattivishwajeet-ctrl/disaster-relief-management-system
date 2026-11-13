
const express = require("express");
const router = express.Router();

const {
    getAllUsers,
    updateUserStatus,
    updateUserRole
} = require("../controllers/adminController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.use(authenticateToken);
router.use(authorizeRoles("ADMIN"));

router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/role", updateUserRole);

module.exports = router;
