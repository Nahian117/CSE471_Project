import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UNIVERSITIES, domainToLabel } from '../constants/universities';
import './ProductForm.css';

// Derive the seller's university label from their stored user object
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
const userDomain   = currentUser?.email ? currentUser.email.split('@')[1] : '';
const userUniLabel = domainToLabel(userDomain);

/**
 * ProductForm – works in two modes:
 *   CREATE mode  (no `product` prop):  posts a new product
 *   EDIT   mode  (`product` prop set): pre-fills the form and PUTs on submit
 *
 * Props:
 *   product   – (optional) existing product object to edit
 *   onSuccess – (optional) callback called after a successful submit
 *   onCancel  – (optional) callback called when the user cancels in edit mode
 */
const ProductForm = ({ product: editProduct, onSuccess, onCancel }) => {
  const isEditMode = !!editProduct;

  const emptyForm = {
    title:      '',
    category:   '',
    condition:  '',
    price:      '',
    description:'',
    images:     [],
    location:   '',
    university: userUniLabel  // pre-fill from seller's email domain
  };

  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill when editing
  useEffect(() => {
    if (editProduct) {
      setFormData({
        title:       editProduct.title       || '',
        category:    editProduct.category    || '',
        condition:   editProduct.condition   || '',
        price:       editProduct.price       || '',
        description: editProduct.description || '',
        images:      editProduct.images      || [],
        location:    editProduct.location    || '',
        university:  editProduct.university  || userUniLabel
      });
    }
  }, [editProduct]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const readers = files.map(
      file =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then(base64Images => {
      setFormData(prev => ({ ...prev, images: base64Images }));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (isEditMode) {
        // Keep existing images if no new ones were selected
        const payload = {
          ...formData,
          images: formData.images.length > 0 ? formData.images : editProduct.images
        };
        await axios.put(`/api/products/${editProduct._id}`, payload, { headers });
        alert('Product updated successfully!');
        onSuccess?.();
      } else {
        await axios.post('/api/products', formData, { headers });
        alert('Product listed successfully!');
        setFormData(emptyForm);
        onSuccess?.();
      }
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || 'Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      {isEditMode && (
        <div className="product-form-mode-badge">✏️ Editing: {editProduct.title}</div>
      )}

      {error && <div className="product-form-error">{error}</div>}

      <input
        type="text"
        name="title"
        placeholder="Product Title"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <select name="category" value={formData.category} onChange={handleChange} required>
        <option value="">Select Category</option>
        <option value="electronics">Electronics</option>
        <option value="books">Books</option>
        <option value="clothing">Clothing</option>
        <option value="furniture">Furniture</option>
        <option value="sports">Sports</option>
        <option value="other">Other</option>
      </select>
      <select name="condition" value={formData.condition} onChange={handleChange} required>
        <option value="">Select Condition</option>
        <option value="new">New</option>
        <option value="used">Used</option>
        <option value="good">Good</option>
      </select>

      {/* ── University ── */}
      <div className="product-form-uni-wrapper">
        <label className="product-form-uni-label">🎓 Listed for University</label>
        <select name="university" value={formData.university} onChange={handleChange} required>
          <option value="">Select University</option>
          {UNIVERSITIES.map(u => (
            <option key={u.domain} value={u.label}>{u.label}</option>
          ))}
        </select>
        {formData.university === userUniLabel && userUniLabel && (
          <p className="product-form-uni-hint">✓ Your own university — pre-selected</p>
        )}
      </div>
      <input
        type="number"
        name="price"
        placeholder="Price (৳)"
        value={formData.price}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        required
      />
      <label className="product-form-image-label">
        {isEditMode ? 'Replace images (optional)' : 'Upload images'}
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          required={!isEditMode}
        />
      </label>

      {/* Preview current images in edit mode */}
      {isEditMode && formData.images.length > 0 && (
        <div className="product-form-image-preview">
          {formData.images.map((src, i) => (
            <img key={i} src={src} alt={`preview-${i}`} />
          ))}
        </div>
      )}

      <input
        type="text"
        name="location"
        placeholder="Pickup Location"
        value={formData.location}
        onChange={handleChange}
      />

      <div className="product-form-actions">
        <button type="submit" disabled={submitting} className="product-form-submit-btn">
          {submitting
            ? (isEditMode ? 'Saving…' : 'Listing…')
            : (isEditMode ? '💾 Save Changes' : '🚀 List Product')}
        </button>
        {isEditMode && onCancel && (
          <button type="button" onClick={onCancel} className="product-form-cancel-btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ProductForm;