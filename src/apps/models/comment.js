const mongoose = require("../../common/database")();
const commentSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    prd_id: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Products",
    },
    body: {
        type: String,
        default: "",
    },
    full_name: {
        type: String,
        required: true,
    },
    is_allowed:{
        type: Boolean,
        default: false,
    },


},{
    timestamps: true,
});

const commentModel = mongoose.model("Comments",commentSchema,"comments");
module.exports = commentModel;
