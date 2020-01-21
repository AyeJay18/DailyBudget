const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');

//Import Routes
const authRoute = require('./routes/auth');
const budgetRoute = require('./routes/budget');

dotenv.config();

//Connect to DB
mongoose.connect(
    process.env.DB_CONNECT,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => console.log('Connected to DB!')
);

//Middleware
app.use(express.json());

//Route MiddleWares
app.use('/api', authRoute);
app.use('/api/budget', budgetRoute);

app.listen(3000, () => console.log('Server up and running!'));
