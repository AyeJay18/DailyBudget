const router = require('express').Router();
const User = require('../model/User');
const jwt = require('jsonwebtoken');
const {registerValidation, loginValidation, profileValidation, forgotPasswordValidation, resetPasswordValidation} = require('../validation');
const bcrypt = require('bcryptjs');
const verify = require('./verifyToken');
const path = require('path');
const hbs = require('nodemailer-express-handlebars'),
    email = process.env.MAILER_EMAIL_ID,
    pass = process.env.MAILER_PASSWORD
    nodemailer = require('nodemailer');

const smtpTransport = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE_PROVIDER,
    auth: {
        user: email,
        pass: pass
    }
});
  
const handlebarsOptions = {
    viewEngine: {
        extName: ".html",
        partialsDir: path.resolve('./templates'),
        defaultLayout: false,
    },
    viewPath: path.resolve('./templates/'),
    extName: '.html'
};

smtpTransport.use('compile', hbs(handlebarsOptions));

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

//Forgot Password
router.post('/forgotpassword', async (req,res) => {
    //Validate User data
    const { error } = forgotPasswordValidation(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    //Check if user exists already
    const user = await User.findOne({email: req.body.email});
    if (!user) return res.status(200).send('If email address is found, a password reset link will be sent.');

    //Create and assign a password reset token
    const payload = {
        email: user.email, 
        _id: user._id
    };
    const secret = user._id + '_' + user.email + '_' + new Date().getTime();
    const token = await jwt.sign(payload, secret);
    updatedUser = await User.updateOne({_id: user._id},
        {$set: {reset_password_token: token,
                reset_password_expires: Date.now() + 3600000}});

    const data = {
        to: user.email,
        from: email,
        template: 'forgot-password-email',
        subject: 'Reset your password for DailyBudget!',
        context: {
            url: process.env.HOSTNAME + 'reset_password?token=' + token,
            name: user.name.split(' ')[0]
        }
    };
    emailResult = await smtpTransport.sendMail(data);
    if (emailResult && emailResult.accepted.length > 0) {
        return res.status(200).send('If email address is found, a password reset link will be sent.');
    } else {
        return res.status(200).send('If email address is found, a password reset link will be sent.');
    }
});

//Reset Password Render Page
router.get('/reset_password', async (req,res) => {
    return res.sendFile(path.resolve('./public/reset-password.html'));
});

//Reset Password
router.post('/reset_password', async (req,res) => {

    //Check if user exists already
    const user = await User.findOne({
        reset_password_token: req.body.token, 
        reset_password_expires: {
            $gt: Date.now()
        }
    });
    if (!user) return res.status(400).send({message: 'Password reset token is invalid or has expired!'});

    if (req.body.newPassword === req.body.verifyPassword) {
        //Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.newPassword,salt);
        user.password = hashedPassword;
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        user.save(function(err) {
            if (err) {
                return res.status(422).send({message: 'Error updating Password!'})
            }
        });
        const data = {
            to: user.email,
            from: email,
            template: 'reset-password-email',
            subject: 'DailyBudget Password Reset Confirmation',
            context: {
                name: user.name.split(' ')[0]
            }
        };

        smtpTransport.sendMail(data, function(err) {
            if (!err) {
                return res.status(200).send({message: 'Password reset, please login using your new password.'});
            } else {
                return res.status(422).send({message: 'Password reset, however a confirmation email could not be sent.'});
            }
        });



    } else {
        return res.status(400).send({message: 'Passwords do not match!'})
    }

});

module.exports = router;
