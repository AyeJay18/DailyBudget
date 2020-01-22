const mongoose = require('mongoose');
const Budget = require('./Budget');

const transactionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 1,
        max: 255
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true
    },
    budget: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Budget'
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);