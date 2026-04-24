const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  saveFilter,
  getSavedFilters,
  deleteSavedFilter
} = require('../controllers/filter.controller');

router.use(protect); // All filter routes require authentication

router.post('/', saveFilter);
router.get('/', getSavedFilters);
router.delete('/:id', deleteSavedFilter);

module.exports = router;