const router = require('express').Router()
const mongoose = require('mongoose');
const User = require('../model/User');
const Budget = require('../model/Budget');
const Transaction = require('../model/Transaction');
const verify = require('./verifyToken');
const {budgetValidation, transactionValidation, uuidValidation} = require('../validation');

//Get All Budgets
router.get('/', verify, async (req,res) => {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    budgets = await Budget.aggregate([
        {'$match': {'$or': [{'owner' : ownerId },{'sharedUsers': ownerId}]}},
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
             'totalTransactions': 1,
             'sharedUsers': 1
         }}
    ]);
    res.send({'budgets': budgets});
});

//Get Budget
router.get('/:budgetId', verify, async (req,res) => {
    //Validate UUID data
    const { error } = uuidValidation(req.params);
    if (error) return res.status(400).send(error.details[0].message);

    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    const budgetId = new mongoose.Types.ObjectId(req.params.budgetId);
    budget = await Budget.aggregate([
        {'$match': {'$and': [
            {'$or': [
                {'sharedUsers': ownerId },
                {'owner' : ownerId }]},
            {'_id': budgetId}]}},
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
             'totalTransactions': 1,
             'sharedUsers': 1
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

//Update Budget
router.put('/:budgetId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);
    
    //Validate Budget data
    const { error } = budgetValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const updatedBudget = await Budget.updateOne({ $and: [{_id: req.params.budgetId},{$or: [{owner: req.user._id},{sharedUsers: req.user._id}]}]},
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

//Delete Budget
router.delete('/:budgetId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    deletedBudget = await Budget.deleteOne({ $and: [{_id: req.params.budgetId},{owner: req.user._id}]});
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

//Get Shared Users
router.get('/:budgetId/share', verify, async (req,res) => {
    const budgetSharedUsers = await Budget.findOne({$and: [{_id: req.params.budgetId},{owner: req.user._id}]}).populate('sharedUsers','name email');
    if (budgetSharedUsers) {
        res.send({'SharedUsers': budgetSharedUsers.sharedUsers});
    } else {
        res.send({'SharedUsers': null});
    }
});

//Add Shared User
router.post('/:budgetId/share', verify, async (req,res) => {
    const email = req.body.email;
    const user = await User.findOne({'email': email});
    const budget = await Budget.findOne({$and: [{'_id': req.params.budgetId},{'owner': req.user._id}]}).populate('sharedUsers','name email');
    if (budget && !budget.sharedUsers.includes(user._id)){
        budget.sharedUsers.push(user);
        budget.save();
        res.send({'sharedUsers': budget.sharedUsers});
    }
    res.send({'sharedUsers': null});
});

//Remove Shared User
router.delete('/:budgetId/share/:sharedUserId', verify, async (req,res) => {
    const budget = await Budget.findOne({$and: [{_id: req.params.budgetId},{owner: req.user._id}]}).populate('sharedUsers','name email');
    if (budget) {
        budget.sharedUsers.pull(req.params.sharedUserId);
        const savedBudget = await budget.save();
        res.send({'sharedUsers': savedBudget.sharedUsers});
    } else {
        res.send({'sharedUsers': null});
    }
});

//Get All Budget Transactions
router.get('/:budgetId/transactions', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        budget = await Budget.findOne({$and: [{_id: req.params.budgetId},{$or: [{owner: req.user._id},{sharedUsers: req.user._id}]}]}).populate('transactions');
        res.send({'transactions': budget.transactions});
    } catch (err) {
        res.status(400).send('Error finding transactions!');
    }
});

//Get All Budget Transactions by Page
router.get('/:budgetId/transactions/:page', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        const resultsPerPage = 20;
        const page = req.params.page || 1;
        const transactionsCount = await Transaction.countDocuments({budget: req.params.budgetId});
        const transactions = await Transaction.find({budget: req.params.budgetId}).skip(resultsPerPage*(page-1)).limit(resultsPerPage);
        res.send({'count': transactionsCount,'transactions': transactions});
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
            name: req.body.name,
            amount: req.body.amount,
            budget: req.params.budgetId
        });
        const budget = await Budget.findOne({$and: [{_id: req.params.budgetId},{$or: [{owner: req.user._id},{sharedUsers: req.user._id}]}]});
        savedTransaction = await transaction.save();
        budget.transactions.push(transaction);
        savedBudget = await budget.save();
        res.send({'transaction': savedTransaction});
    } catch (err) {
        res.status(400).send(err.message);
    }
});

//Get Transaction
router.get('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        const transaction = await Transaction.findOne({$and: [{_id: req.params.transactionId},
                                                            {budget: req.params.budgetId}]});
        if (transaction) {
            res.send({'transaction': transaction});
        } else {
            res.status(400).send('Transaction not found!');
        }
    } catch (err) {
        res.status(400).send(err.message);
    }
});             

//Update Transaction
router.put('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    //Validate Transaction data
    const { error } = transactionValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        updatedTransaction = await Transaction.updateOne({ $and: [{_id: req.params.transactionId},{budget: req.params.budgetId}]},
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

//Delete Transaction
router.delete('/:budgetId/transactions/:transactionId', verify, async (req,res) => {
    //Validate UUID data
    const { uuidError } = uuidValidation(req.params);
    if (uuidError) return res.status(400).send(error.details[0].message);

    try {
        deletedTransaction = await Transaction.deleteOne({ $and: [{_id: req.params.transactionId},{budget: req.params.budgetId}]});
        if (deletedTransaction && deletedTransaction.deletedCount == 1) {
            const budget = await Budget.findOne({$and: [{_id: req.params.budgetId},{$or: [{owner: req.user._id},{sharedUsers: req.user._id}]}]});
            budget.transactions.pull(req.params.transactionId);
            savedBudget = await budget.save();
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