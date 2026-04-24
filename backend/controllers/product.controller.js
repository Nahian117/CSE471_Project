const Product = require('../models/Product');
const Message = require('../models/Message');
const SavedFilter = require('../models/SavedFilter');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create product listing
const createProduct = async (req, res) => {
  try {
    const { title, category, condition, price, description, images, location, university: bodyUniversity } = req.body;

    if (req.user.studentType !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can list products' });
    }

    const seller = req.user._id;
    // Use seller-chosen university name; fall back to email domain if not sent
    const university = (bodyUniversity && bodyUniversity.trim())
      ? bodyUniversity.trim()
      : req.user.email.split('@')[1];

    const product = new Product({
      seller,
      title,
      category,
      condition,
      price,
      description,
      images,
      university,
      location
    });

    await product.save();

    // Check saved filters and notify users
    await checkSavedFilters(product);

    res.status(201).json({
      message: 'Product listed successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get products with filters
const getProducts = async (req, res) => {
  try {
    const {
      category,
      condition,
      minPrice,
      maxPrice,
      university,
      search,
      seller,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (university) filter.university = university;
    if (search) filter.$text = { $search: search };
    if (seller) filter.seller = seller;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('seller', 'name email university')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email university');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = req.body;
    Object.assign(product, updates);
    await product.save();

    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    product.isActive = false;
    await product.save();

    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check saved filters and create in-app notifications for matches
const checkSavedFilters = async (product) => {
  const filters = await SavedFilter.find({ isActive: true });

  for (const filter of filters) {
    let match = true;

    if (filter.filters.category && filter.filters.category !== product.category) match = false;
    if (filter.filters.condition && filter.filters.condition !== product.condition) match = false;
    if (filter.filters.minPrice && product.price < filter.filters.minPrice) match = false;
    if (filter.filters.maxPrice && product.price > filter.filters.maxPrice) match = false;
    if (filter.filters.university && filter.filters.university !== product.university) match = false;

    if (match) {
      // Create an in-app notification for the filter owner
      await Notification.create({
        user: filter.user,
        type: 'filter_match',
        title: '🔔 New match for your saved filter!',
        body: `"${product.title}" matches your filter "${filter.name}" — ৳${product.price} · ${product.condition}`,
        product: product._id,
        savedFilter: filter._id
      });

      filter.lastNotified = new Date();
      await filter.save();

      console.log(`[Filter] Notification created for user ${filter.user} — filter "${filter.name}" matched product "${product.title}"`);
    }
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct
};