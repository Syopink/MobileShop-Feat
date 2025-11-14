const mongoose = require('../../common/database')()

const newCategorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  left: {
    type: Number,
    default: 0
  },
  right: {
    type: Number,
    default: 0
  },
  cat_parrent: {
    type: mongoose.Types.ObjectId,
    ref: 'newCategory',
    default: null
  },
  is_delete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

const newCategoryModel = mongoose.model('newCategory', newCategorySchema, 'newcategories')

module.exports = newCategoryModel