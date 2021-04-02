const router = require('express').Router();
const User = require('../model/User');
const jwt = require('jsonwebtoken');
const {registerValidation, loginValidation, profileValidation} = require('../validation');
const bcrypt = require('bcryptjs');
const verify = require('./verifyToken');

//Register New User
router.post('/register', async (req,res) => {
    //Validate User data
    const { error } = registerValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //Check if user exists already
    const emailExists = await User.findOne({email: req.body.email});
    if (emailExists && emailExists.count > 0) return res.status(400).send('Email already exists!');
    
    //Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password,salt);

    //Create New User
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword
    });
    
    //Save New User
    try {
        const savedUser = await user.save();
        res.send({user: user._id});
    }catch (err){
        res.status(400).send(err);
    }
});

//Login User
router.post('/login', async (req,res) => {
    //Validate User data
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //Check if user exists already
    const user = await User.findOne({email: req.body.email});
    if (!user) return res.status(400).send('Email not found!');

    //Check Password is correct
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid Password!');

    //Create and assign a token
    const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);

    res.header('token', token);
    res.send({user: user._id,'token': token, name: user.name, email: user.email});
});

//Update User Profile
router.put('/profile', verify, async (req,res) => {
    //Validate User data
    const { error } = profileValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //Check if user exists already
    const emailExists = await User.find({$and: [{email: req.body.email},{_id: {$ne: req.user._id}}]});
    if (emailExists.count > 0) return res.status(400).send('Email already claimed!');

    if (req.body.password) {
        //Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password,salt);
    }
    try {
         var updatedUser;
         if (req.body.password) {
             updatedUser = await User.updateOne({_id: req.user._id},
                                                     {$set: {name: req.body.name,
                                                             email: req.body.email,
                                                             password: hashedPassword}});
         } else {
             updatedUser = await User.updateOne({_id: req.user._id},
                                                     {$set: {name: req.body.name,
                                                             email: req.body.email}});
         }
         if (updatedUser) {
             if (updatedUser.nModified == 1){
                 res.send({updated: true});
             } else {
                 res.send({updated: false});
             }
         } else {
             console.log(updatedUser);
             res.status(400).send({updated: false});
         }
    } catch (err) {
         res.status(400).send({updated: false});
    }
});

module.exports = router;
