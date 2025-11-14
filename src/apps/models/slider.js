const mongoose = require('../../common/database')()

const sliderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  thumbnails: {
    type: String,
    required: true
  },
  is_delete:{
    type:Boolean,
    default:false,
  },
}, { timestamps: true })

const sliderModel = mongoose.model('Sliders', sliderSchema, 'sliders')

module.exports = sliderModel;