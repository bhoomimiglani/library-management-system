const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: String,
    year: Number,
    cover: String,
    available: { type: Boolean, default: true },
    issuedTo: { type: String, default: "" }
});

module.exports = mongoose.model('Book', bookSchema);
