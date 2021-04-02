const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const cors = require('cors');

const httpsServer = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/api.martinirita.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/api.martinirita.com/fullchain.pem'),
}, app);

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

//app.listen(3000, () => console.log('Server up and running!'));
httpsServer.listen(3000, () => console.log('Server up and running!'));
