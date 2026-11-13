
const { pool } = require("../config/database");

const CAMP_STATUSES = ["ACTIVE", "FULL", "CLOSED"];

async function getAllCamps(req, res) {
    try {
        const [camps] = await pool.query(`
            SELECT
                c.*,
                a.area_name,
                d.disaster_name,
                (c.capacity - c.current_occupancy) AS available_capacity
            FROM camps c
            JOIN affected_areas a ON c.area_id = a.area_id
            JOIN disasters d ON a.disaster_id = d.disaster_id
            ORDER BY c.created_at DESC
        `);

        return res.status(200).json({
            success: true,
            count: camps.length,
            camps
        });
    } catch (error) {
        console.error("Get camps error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve camps."
        });
    }
}

async function getCampById(req, res) {
    try {
        const campId = Number(req.params.id);

        if (!Number.isInteger(campId) || campId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid camp ID."
            });
        }

        const [camps] = await pool.query(`
            SELECT
                c.*,
                a.area_name,
                d.disaster_name,
                (c.capacity - c.current_occupancy) AS available_capacity
            FROM camps c
            JOIN affected_areas a ON c.area_id = a.area_id
            JOIN disasters d ON a.disaster_id = d.disaster_id
            WHERE c.camp_id = ?
        `, [campId]);

        if (camps.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Camp not found."
            });
        }

        return res.status(200).json({
            success: true,
            camp: camps[0]
        });
    } catch (error) {
        console.error("Get camp error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve camp."
        });
    }
}

async function createCamp(req, res) {
    try {
        const {
            area_id,
            camp_name,
            location_description,
            capacity,
            current_occupancy = 0,
            contact_number
        } = req.body;

        const areaId = Number(area_id);
        const campCapacity = Number(capacity);
        const occupancy = Number(current_occupancy);

        if (
            !Number.isInteger(areaId) ||
            areaId <= 0 ||
            typeof camp_name !== "string" ||
            !camp_name.trim() ||
            !Number.isInteger(campCapacity) ||
            campCapacity <= 0 ||
            !Number.isInteger(occupancy) ||
            occupancy < 0 ||
            occupancy > campCapacity
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a valid area, camp name, capacity, and occupancy."
            });
        }

        const [areas] = await pool.query(
            "SELECT area_id FROM affected_areas WHERE area_id = ?",
            [areaId]
        );

        if (areas.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Affected area not found."
            });
        }

        const status = occupancy === campCapacity ? "FULL" : "ACTIVE";

        const [result] = await pool.query(`
            INSERT INTO camps (
                area_id,
                camp_name,
                location_description,
                capacity,
                current_occupancy,
                contact_number,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            areaId,
            camp_name.trim(),
            location_description || null,
            campCapacity,
            occupancy,
            contact_number || null,
            status
        ]);

        return res.status(201).json({
            success: true,
            message: "Relief camp created successfully.",
            camp_id: result.insertId
        });
    } catch (error) {
        console.error("Create camp error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create camp."
        });
    }
}

async function updateCampOccupancy(req, res) {
    let connection;

    try {
        const campId = Number(req.params.id);
        const occupancy = Number(req.body.current_occupancy);

        if (
            !Number.isInteger(campId) ||
            campId <= 0 ||
            !Number.isInteger(occupancy) ||
            occupancy < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a valid camp ID and non-negative occupancy."
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [camps] = await connection.query(`
            SELECT capacity, current_occupancy, status
            FROM camps
            WHERE camp_id = ?
            FOR UPDATE
        `, [campId]);

        if (camps.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Camp not found."
            });
        }

        const camp = camps[0];

        if (camp.status === "CLOSED") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot update occupancy of a closed camp."
            });
        }

        if (occupancy > camp.capacity) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Occupancy cannot exceed camp capacity."
            });
        }

        const status = occupancy === camp.capacity ? "FULL" : "ACTIVE";

        await connection.query(`
            UPDATE camps
            SET current_occupancy = ?, status = ?
            WHERE camp_id = ?
        `, [occupancy, status, campId]);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Camp occupancy updated successfully.",
            camp_id: campId,
            current_occupancy: occupancy,
            capacity: camp.capacity,
            status
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (_) {}
        }

        console.error("Update camp occupancy error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update camp occupancy."
        });
    } finally {
        if (connection) connection.release();
    }
}

async function updateCampStatus(req, res) {
    try {
        const campId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(campId) || campId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid camp ID."
            });
        }

        if (!CAMP_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ACTIVE, FULL, or CLOSED."
            });
        }

        const [camps] = await pool.query(
            "SELECT capacity, current_occupancy FROM camps WHERE camp_id = ?",
            [campId]
        );

        if (camps.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Camp not found."
            });
        }

        const camp = camps[0];

        if (status === "FULL" && camp.current_occupancy < camp.capacity) {
            return res.status(400).json({
                success: false,
                message: "A camp can be marked FULL only when its capacity is reached."
            });
        }

        if (status === "ACTIVE" && camp.current_occupancy >= camp.capacity) {
            return res.status(400).json({
                success: false,
                message: "A camp at full capacity cannot be marked ACTIVE."
            });
        }

        await pool.query(
            "UPDATE camps SET status = ? WHERE camp_id = ?",
            [status, campId]
        );

        return res.status(200).json({
            success: true,
            message: "Camp status updated successfully.",
            camp_id: campId,
            status
        });
    } catch (error) {
        console.error("Update camp status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update camp status."
        });
    }
}

module.exports = {
    getAllCamps,
    getCampById,
    createCamp,
    updateCampOccupancy,
    updateCampStatus
};
