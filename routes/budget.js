const router = require('express').Router()
const mongoose = require('mongoose');
const Budget = require('../model/Budget');
const Transaction = require('../model/Transaction');
//Add for Private Routes
const verify = require('./verifyToken');

//Add verify for private methods
//TODO:
// Add Validation for fields

//Get Budget Summary
router.get('/', verify, async (req,res) => {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    budgets = await Budget.aggregate([
        {'$match': {'owner' : ownerId }},
        {"$lookup": {
            "from": "transactions",
            "localField": "_id",
            "foreignField": "budget",
            "as": "resTransactions"
            }
        },
        {'$addFields': {
             'totalTransactions': {
                 '$reduce': {
                     'input': '$resTransactions',
                     'initialValue': 0,
                     'in': {'$round': [{'$add': ['$$value', '$$this.amount']},2]}
                 }
             }
         }},
         {'$project': {
             'recurringCustom': 1,
             'owner': 1,
             'name': 1,
             'recurringType': 1,
             'recurringAmount': 1,
             'dateCreated': 1,
             'totalTransactions': 1
         }}
    ]);
    res.send(budgets);
});

//Get specific Budget
router.get('/:budgetId', verify, async (req,res) => {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    const budgetId = new mongoose.Types.ObjectId(req.params.budgetId);
    budget = await Budget.aggregate([
        {'$match': {'$and': [{'owner' : ownerId },{'_id': budgetId}]}},
        {"$lookup": {
            "from": "transactions",
            "localField": "_id",
            "foreignField": "budget",
            "as": "resTransactions"
            }
        },
        {'$addFields': {
             'totalTransactions': {
                 '$reduce': {
                     'input': '$resTransactions',
                     'initialValue': 0,
                     'in': {'$round': [{'$add': ['$$value', '$$this.amount']},2]}
                 }
             }
         }},
         {'$project': {
             'recurringCustom': 1,
             'owner': 1,
             'name': 1,
             'recurringType': 1,
             'recurringAmount': 1,
             'dateCreated': 1,
             'totalTransactions': 1
         }}
    ]);
    res.send(budget);
});

//Add New Budget
router.post('/', verify, async (req,res) => {
    const budget = new Budget({
        owner: req.user._id,
        name: req.body.name,
        recurringType: req.body.recurringType,
        recurringAmount: req.body.recurringAmount,
        recurringCustom: req.body.recurringCustom
    });
    try {
        const savedBudget = await budget.save();
        res.send({budget: savedBudget});
    } catch (err) {
        res.status(400).send(err.message);
    }
});

//Update specific budget
router.put('/:budgetId', verify, async (req,res) => {
    try {
        updatedBudget = await Budget.updateOne({ $and: [{_id: {$eq: req.params.budgetId}},{owner: {$eq: req.user._id}}]},
                                                {$set: {name: req.body.name,
                                                        recurringType: req.body.recurringType,
                                                        recurringAmount: req.body.recurringAmount,
                                                        recurringCustom: req.body.recurringCustom}});
        if (updatedBudget && updatedBudget.nModified == 1){
            res.send({updated: true});
        } else {
            res.send({updated: false});
        }
    } catch(err){
        res.status(400).send({updated: false});
    }
});

//Delete Specific Budget
router.delete('/:budgetId', verify, async (req,res) => {
    deletedBudget = await Budget.deleteOne({ $and: [{_id: {$eq: req.params.budgetId}},{owner: {$eq: req.user._id}}]});
    if (deletedBudget && deletedBudget.deletedCount == 1) {
        res.send({deleted: true});
    } else {
        res.status(400).send({deleted: false});
    }
});

//Get specific Budget all Transactions
router.get('/:budgetId/transactions', verify, async (req,res) => {
    budget = await Budget.findOne({_id: req.params.budgetId}).populate('transactions');
    res.send(budget.transactions);
});

//Add New Transaction
router.post('/:budgetId/transactions', verify, async (req,res) => {
    const transaction = new Transaction({
        owner: req.user._id,
        name: req.body.name,
        amount: req.body.amount,
        budget: req.params.budgetId
    });
    const budget = await Budget.findOne({_id: req.params.budgetId});
    savedTransaction = await transaction.save();
    budget.transactions.push(transaction);
    savedBudget = await budget.save();
    res.send(savedBudget);
});

module.exports = router;