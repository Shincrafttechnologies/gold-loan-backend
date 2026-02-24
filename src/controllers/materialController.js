const Material = require('../models/Materials');
const { Op } = require('sequelize');

exports.getAllMaterials = async (req, res) => {
    try {
        const materials = await Material.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: materials.length,
            materials: materials
        });
    } catch (error) {
        console.error("Error fetching materials:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.addMaterial = async (req, res) => {
    try {
        const { material_name } = req.body;

        if (!material_name) {
            return res.status(400).json({ success: false, message: "Material Name is required" });
        }

        const existing = await Material.findOne({ where: { material_name } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Material already exists" });
        }

        const newMaterial = await Material.create({ material_name });

        res.status(201).json({
            success: true,
            message: "Material added successfully",
            material: newMaterial
        });

    } catch (error) {
        console.error("Error adding material:", error);
        res.status(500).json({ success: false, message: "Failed to add material", error: error.message });
    }
};

exports.deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCount = await Material.destroy({
            where: { id: id }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Material not found" });
        }

        res.status(200).json({
            success: true,
            message: "Material deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting material:", error);
        res.status(500).json({ success: false, message: "Failed to delete material", error: error.message });
    }
};

exports.getMaterialByName = async (req, res) => {
    try {
        const { name } = req.params;

        if (!name) {
            return res.status(400).json({ success: false, message: "Search term is required" });
        }

        // 2. Use findAll with Op.like for partial matching
        const materials = await Material.findAll({
            where: {
                material_name: {
                    [Op.like]: `%${name}%` // Matches 'Gold', 'Golden', 'Old Gold'
                }
            }
        });

        if (materials.length === 0) {
            return res.status(404).json({ success: false, message: "No materials found" });
        }

        res.status(200).json({
            success: true,
            count: materials.length,
            materials: materials // Returns an array of matches
        });

    } catch (error) {
        console.error("Error searching material:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};