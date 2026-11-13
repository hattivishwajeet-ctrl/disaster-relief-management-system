
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const requestRoutes = require("./routes/requestRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const disasterRoutes = require("./routes/disasterRoutes");
const areaRoutes = require("./routes/areaRoutes");
const campRoutes = require("./routes/campRoutes");

const {
    pool,
    testDatabaseConnection
} = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Disaster Relief Management API is running"
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS database_name, VERSION() AS mysql_version"
        );

        res.status(200).json({
            success: true,
            message: "Database connection successful",
            database: rows[0].database_name,
            mysqlVersion: rows[0].mysql_version
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/disasters", disasterRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/camps", campRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        await testDatabaseConnection();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
