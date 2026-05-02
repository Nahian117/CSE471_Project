const SavedFilter = require('../models/SavedFilter');

// Save filter
const saveFilter = async (req, res) => {
  try {
    const { name, filters = {} } = req.body;
    const user = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Filter name is required' });
    }

    const normalizedFilters = {
      category: filters.category || req.body.category || undefined,
      condition: filters.condition || req.body.condition || undefined,
      minPrice: filters.minPrice ?? (req.body.minPrice ? Number(req.body.minPrice) : undefined),
      maxPrice: filters.maxPrice ?? (req.body.maxPrice ? Number(req.body.maxPrice) : undefined),
      university: filters.university || req.body.university || undefined
    };

    const savedFilter = new SavedFilter({
      user,
      name,
      filters: normalizedFilters
    });

    await savedFilter.save();

    res.status(201).json({
      message: 'Filter saved',
      filter: savedFilter
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's saved filters
const getSavedFilters = async (req, res) => {
  try {
    const filters = await SavedFilter.find({ user: req.user._id, isActive: true });
    res.json(filters);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete saved filter
const deleteSavedFilter = async (req, res) => {
  try {
    const filter = await SavedFilter.findById(req.params.id);

    if (!filter || filter.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Filter not found' });
    }

    filter.isActive = false;
    await filter.save();

    res.json({ message: 'Filter deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  saveFilter,
  getSavedFilters,
  deleteSavedFilter
};