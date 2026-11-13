
const { pool } = require("../config/database");

// GET: Retrieve all affected areas
async function getAllAreas(req, res) {
    try {
        const [areas] = await pool.query(`
            SELECT
                a.*,
                d.disaster_name,
                d.status AS disaster_status,
                COUNT(DISTINCT c.camp_id) AS total_camps
            FROM affected_areas a
            JOIN disasters d ON a.disaster_id = d.disaster_id
            LEFT JOIN camps c ON a.area_id = c.area_id
            GROUP BY a.area_id
            ORDER BY a.created_at DESC
        `);

        return res.status(200).json({
            success: true,
            count: areas.length,
            areas
        });
    } catch (error) {
        console.error("Get affected areas error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve affected areas."
        });
    }
}

// GET: Retrieve affected areas for a disaster
async function getAreasByDisaster(req, res) {
    try {
        const disasterId = Number(req.params.disasterId);

        if (!Number.isInteger(disasterId) || disasterId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid disaster ID."
            });
        }

        const [areas] = await pool.query(`
            SELECT
                a.*,
                COUNT(DISTINCT c.camp_id) AS total_camps
            FROM affected_areas a
            LEFT JOIN camps c ON a.area_id = c.area_id
            WHERE a.disaster_id = ?
            GROUP BY a.area_id
            ORDER BY a.created_at DESC
        `, [disasterId]);

        return res.status(200).json({
            success: true,
            count: areas.length,
            areas
        });
    } catch (error) {
        console.error("Get areas by disaster error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve affected areas."
        });
    }
}

// POST: Create an affected area
async function createArea(req, res) {
    try {
        const {
            disaster_id,
            area_name,
            population_affected,
            severity,
            latitude,
            longitude
        } = req.body;

        if (
            !Number.isInteger(Number(disaster_id)) ||
            Number(disaster_id) <= 0 ||
            typeof area_name !== "string" ||
            !area_name.trim() ||
            !Number.isInteger(population_affected) ||
            population_affected < 0 ||
            !Number.isInteger(severity) ||
            severity < 0 ||
            severity > 127
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing affected area details."
            });
        }

        if (
            (latitude != null &&
                (!Number.isFinite(Number(latitude)) ||
                 Number(latitude) < -90 ||
                 Number(latitude) > 90)) ||
            (longitude != null &&
                (!Number.isFinite(Number(longitude)) ||
                 Number(longitude) < -180 ||
                 Number(longitude) > 180))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude or longitude."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO affected_areas
                (disaster_id, area_name, population_affected,
                 severity, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Number(disaster_id),
                area_name.trim(),
                population_affected,
                severity,
                latitude ?? null,
                longitude ?? null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Affected area created successfully.",
            area_id: result.insertId
        });
    } catch (error) {
        console.error("Create affected area error:", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({
                success: false,
                message: "The specified disaster does not exist."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create affected area."
        });
    }
}

module.exports = {
    getAllAreas,
    getAreasByDisaster,
    createArea
};
