const mongoose = require('mongoose');

// Vercel serverless functions shouldn't create new connections for every request
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState;
    console.log(`MongoDB Connected: ${db.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Do not exit process in Vercel serverless environment unless absolutely necessary
    // process.exit(1); 
  }
};

module.exports = connectDB;
