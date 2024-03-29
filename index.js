const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const port = process.env.SERVER_PORT || 3000;

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
app.use(cors());

//Route MiddleWares
app.use('/', authRoute);
app.use('/budget', budgetRoute);

app.listen(port, () => console.log('Server up and running!'));
