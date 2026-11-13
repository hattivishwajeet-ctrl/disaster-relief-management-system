
const { pool } = require("../config/database");

const DISASTER_TYPES = [
    "FLOOD",
    "EARTHQUAKE",
    "CYCLONE",
    "LANDSLIDE",
    "FIRE",
    "OTHER"
];

const DISASTER_STATUSES = [
    "ACTIVE",
    "CONTAINED",
    "RESOLVED"
];

// GET: Retrieve all disasters
async function getAllDisasters(req, res) {
    try {
        const [disasters] = await pool.query(`
            SELECT
                d.*,
                u.full_name AS created_by_name,

                COALESCE(
                    a.total_affected_areas, 0
                ) AS total_affected_areas,

                COALESCE(
                    a.total_population_affected, 0
                ) AS total_population_affected,

                COALESCE(
                    c.total_camps, 0
                ) AS total_camps

            FROM disasters d

            LEFT JOIN users u
                ON d.created_by = u.user_id

            LEFT JOIN (
                SELECT
                    disaster_id,
                    COUNT(*) AS total_affected_areas,
                    SUM(population_affected)
                        AS total_population_affected
                FROM affected_areas
                GROUP BY disaster_id
            ) a
                ON d.disaster_id = a.disaster_id

            LEFT JOIN (
                SELECT
                    aa.disaster_id,
                    COUNT(c.camp_id) AS total_camps
                FROM affected_areas aa
                LEFT JOIN camps c
                    ON aa.area_id = c.area_id
                GROUP BY aa.disaster_id
            ) c
                ON d.disaster_id = c.disaster_id

            ORDER BY d.created_at DESC
        `);

        return res.status(200).json({
            success: true,
            count: disasters.length,
            disasters
        });

    } catch (error) {
        console.error("Get disasters error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve disasters."
        });
    }
}


// GET: Retrieve one disaster with its affected areas and camps
async function getDisasterById(req, res) {
    try {
        const disasterId = Number(req.params.id);

        if (!Number.isInteger(disasterId) || disasterId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid disaster ID."
            });
        }

        const [disasters] = await pool.query(
            `SELECT * FROM disasters WHERE disaster_id = ?`,
            [disasterId]
        );

        if (disasters.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Disaster not found."
            });
        }

        const [areas] = await pool.query(
            `SELECT
                a.*,
                COUNT(c.camp_id) AS total_camps
             FROM affected_areas a
             LEFT JOIN camps c
                ON a.area_id = c.area_id
             WHERE a.disaster_id = ?
             GROUP BY a.area_id`,
            [disasterId]
        );

        return res.status(200).json({
            success: true,
            disaster: disasters[0],
            affected_areas: areas
        });

    } catch (error) {
        console.error("Get disaster error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve disaster."
        });
    }
}


// POST: Create a disaster
async function createDisaster(req, res) {
    try {
        const {
            disaster_name,
            disaster_type,
            severity,
            description,
            start_date
        } = req.body;

        if (
            !disaster_name ||
            typeof disaster_name !== "string" ||
            !disaster_name.trim() ||
            !DISASTER_TYPES.includes(disaster_type) ||
            !Number.isInteger(severity) ||
            severity < 0 ||
            severity > 127 ||
            !start_date ||
            Number.isNaN(Date.parse(start_date))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing disaster details."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO disasters
                (disaster_name, disaster_type, severity,
                 description, start_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                disaster_name.trim(),
                disaster_type,
                severity,
                description || null,
                start_date,
                req.user.user_id
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Disaster created successfully.",
            disaster_id: result.insertId
        });

    } catch (error) {
        console.error("Create disaster error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create disaster."
        });
    }
}


// PATCH: Update disaster status
async function updateDisasterStatus(req, res) {
    try {
        const disasterId = Number(req.params.id);
        const { status, end_date } = req.body;

        if (!Number.isInteger(disasterId) || disasterId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid disaster ID."
            });
        }

        if (!DISASTER_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid disaster status."
            });
        }

        if (
            end_date !== undefined &&
            end_date !== null &&
            Number.isNaN(Date.parse(end_date))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid end date."
            });
        }

        const [result] = await pool.query(
            `UPDATE disasters
             SET status = ?,
                 end_date = CASE
                     WHEN ? = 'RESOLVED'
                         THEN COALESCE(?, CURRENT_TIMESTAMP)
                     WHEN ? = 'ACTIVE'
                         THEN NULL
                     ELSE end_date
                 END
             WHERE disaster_id = ?`,
            [
                status,
                status,
                end_date || null,
                status,
                disasterId
            ]
        );

        if (result.affectedRows === 0) {
            const [existing] = await pool.query(
                `SELECT disaster_id
                 FROM disasters
                 WHERE disaster_id = ?`,
                [disasterId]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Disaster not found."
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Disaster status updated successfully."
        });

    } catch (error) {
        console.error("Update disaster error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update disaster status."
        });
    }
}


module.exports = {
    getAllDisasters,
    getDisasterById,
    createDisaster,
    updateDisasterStatus
};
