const mongoose = require('mongoose');
const Transaction = require('./Transaction');

const opts = {toJSON: {virtuals: true}};

const budgetSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sharedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
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
    recurringType: {
        type: String,
        enum: ['Monthly','Weekly','Daily','Yearly','CustomDaily'],
        required: true
    },
    recurringCustom: [
        { type: Number }
    ],
    recurringAmount: {
        type: Number
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }]
},opts);

module.exports = mongoose.model('Budget', budgetSchema);
