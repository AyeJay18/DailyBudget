const router = require('express').Router()
const mongoose = require('mongoose');
const Budget = require('../model/Budget');
const Transaction = require('../model/Transaction');
//Add for Private Routes
const verify = require('./verifyToken');
const {budgetValidation, transactionValidation, uuidValidation} = require('../validation');

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
    res.send({'budgets': budgets});
});

//Get specific Budget
router.get('/:budgetId', verify, async (req,res) => {
    //Validate UUID data
    const { error } = uuidValidation(req.params);
    if (error) return res.status(400).send(error.details[0].message);

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
    res.send({'budget': budget});
});

//Add New Budget
router.post('/', verify, async (req,res) => {
    //Validate Budget data
    const { error } = budgetValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

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
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);
    
    //Validate Budget data
    const { error } = budgetValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

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
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    deletedBudget = await Budget.deleteOne({ $and: [{_id: {$eq: req.params.budgetId}},{owner: {$eq: req.user._id}}]});
    if (deletedBudget && deletedBudget.deletedCount == 1) {
        deletedTrans = await Transaction.deleteMany({budget: req.params.budgetId});
        res.send({deletedBudget: true,
                  deletedBudgetCount: deletedBudget.deletedCount,
                  deletedTrans: true,
                  deletedTransCount: deletedTrans.deletedCount});
    } else {
        res.status(400).send({deleted: false,count: deletedBudget.deletedCount});
    }
});

//Get specific Budget all Transactions
router.get('/:budgetId/transactions', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        budget = await Budget.findOne({_id: req.params.budgetId}).populate('transactions');
        res.send({'transactions': budget.transactions});
    } catch (err) {
        res.status(400).send('Error finding transactions!');
    }
});

//Add New Transaction
router.post('/:budgetId/transactions', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    //Validate Transaction data
    const { error } = transactionValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
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
        res.send({'transaction': savedTransaction});
    } catch (err) {
        res.status(400).send(err.message);
    }
});

//Get specific transaction
router.get('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        const transaction = await Transaction.findOne({$and: [{_id: req.params.transactionId},
                                                            {budget: req.params.budgetId},
                                                            {owner: req.user._id}]});
        if (transaction) {
            res.send({'transaction': transaction});
        } else {
            res.status(400).send('Transaction not found!');
        }
    } catch (err) {
        res.status(400).send(err.message);
    }
});             

//Update specific transaction
router.put('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    //Validate Transaction data
    const { error } = transactionValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        updatedTransaction = await Transaction.updateOne({ $and: [{_id: req.params.transactionId},{owner: req.user._id},{budget: req.params.budgetId}]},
                                                {$set: {name: req.body.name,
                                                        amount: req.body.amount}});
        if (updatedTransaction && updatedTransaction.nModified == 1){
            res.send({updated: true});
        } else {
            res.send({updated: false});
        }
    } catch(err){
        res.status(400).send({updated: false});
    }
});

//Delete Specific Transaction
//TODO: Delete Transaction from Budget array
router.delete('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        deletedTransaction = await Transaction.deleteOne({ $and: [{_id: req.params.transactionId},{owner: req.user._id},{budget: req.params.budgetId}]});
        if (deletedTransaction && deletedTransaction.deletedCount == 1) {
            res.send({deleted: true,
                    count: deletedTransaction.deletedCount});
        } else {
            res.status(400).send({deleted: false,count: deletedTransaction.deletedCount});
        }
    } catch (err) {
        res.status(400).send({deleted: false,message: err.message});
    }
});

module.exports = router;