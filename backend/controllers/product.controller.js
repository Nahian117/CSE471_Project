const Product = require('../models/Product');
const Message = require('../models/Message');
const SavedFilter = require('../models/SavedFilter');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create product listing
const createProduct = async (req, res) => {
  try {
    const { title, category, condition, price, description, location, university: bodyUniversity } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    const allowedRoles = ['admin', 'moderator'];
    if (req.user.studentType !== 'seller' && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only sellers can list products' });
    }

    const seller = req.user._id;
    const university = (bodyUniversity && bodyUniversity.trim())
      ? bodyUniversity.trim()
      : req.user.email.split('@')[1];

    // Parse pickupLocation (sent as JSON string from FormData)
    let pickupLocation = {};
    if (req.body.pickupLocation) {
      try {
        const parsed = typeof req.body.pickupLocation === 'string'
          ? JSON.parse(req.body.pickupLocation)
          : req.body.pickupLocation;
        const lat = parseFloat(parsed.lat);
        const lng = parseFloat(parsed.lng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          pickupLocation = { name: parsed.name || '', address: parsed.address || '', lat, lng };
        }
      } catch (e) { /* ignore malformed JSON */ }
    }

    const product = new Product({
      seller, title, category, condition, price, description, images, university, location, pickupLocation
    });

    await product.save();
    await checkSavedFilters(product);
    await checkWishlists(product);

    res.status(201).json({ message: 'Product listed successfully', product });
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

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }
    if (req.body.existingImages) {
      const existing = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
      images = [...images, ...existing];
    }

    const updates = { ...req.body };
    if (images.length > 0) {
      updates.images = images;
    }

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

    if (product.seller.toString() !== req.user._id.toString() && req.userRole !== 'admin' && req.userRole !== 'moderator') {
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

const checkWishlists = async (newProduct) => {
  // Find users who have items in their wishlist with the same category
  // and some keyword overlap in the title.
  const users = await User.find({ 'wishlist.0': { $exists: true } }).populate('wishlist');
  
  const newTitleWords = newProduct.title.toLowerCase().split(/\s+/);

  for (const user of users) {
    // Prevent notifying the seller themselves
    if (user._id.toString() === newProduct.seller.toString()) continue;

    let isSimilar = false;
    for (const wProduct of user.wishlist) {
      if (wProduct.category === newProduct.category) {
        const wTitleWords = wProduct.title.toLowerCase().split(/\s+/);
        // Check for any matching word length > 3
        const overlap = newTitleWords.some(word => word.length > 3 && wTitleWords.includes(word));
        if (overlap) {
          isSimilar = true;
          break;
        }
      }
    }

    if (isSimilar) {
      await Notification.create({
        user: user._id,
        type: 'wishlist_match',
        title: '❤️ Similar item listed!',
        body: `An item similar to your wishlist has been listed: "${newProduct.title}" for ৳${newProduct.price}`,
        product: newProduct._id
      });
    }
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const index = user.wishlist.indexOf(productId);

    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
    }

    await user.save();
    res.json({ message: 'Wishlist updated', wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'seller', select: 'name email university' }
    });
    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  toggleWishlist,
  getWishlist
};