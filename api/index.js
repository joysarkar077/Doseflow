const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('../config/db');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cookieParser());
app.use(cors());

// Define Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/schedules', require('../routes/schedules'));
app.use('/api/medicines', require('../routes/medicines'));
app.use('/api/logs', require('../routes/logs'));
app.use('/api/device', require('../routes/device'));
app.use('/api/deviceApi', require('../routes/deviceApi'));

module.exports = app;
