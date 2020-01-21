const router = require('express').Router();
const User = require('../model/User');
const jwt = require('jsonwebtoken');
const {registerValidation, loginValidation} = require('../validation');
const bcrypt = require('bcryptjs');

//Register New User
router.post('/register', async (req,res) => {
    //Validate User data
    const { error } = registerValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //Check if user exists already
    const emailExists = await User.findOne({email: req.body.email});
    if (emailExists) return res.status(400).send('Email already exists!');
    
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

    res.header('auth-token', token);
    res.send('Logged In!');
});

module.exports = router;