const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authenticateAdmin = require('../middleware/authMiddleware');

router.get('/all', authenticateAdmin, materialController.getAllMaterials);
router.post('/add', authenticateAdmin, materialController.addMaterial);
router.delete('/delete/:id', authenticateAdmin, materialController.deleteMaterial);
router.get('/find/:name', authenticateAdmin, materialController.getMaterialByName);

module.exports = router;