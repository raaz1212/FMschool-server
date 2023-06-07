const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require('jsonwebtoken');
require("dotenv").config();
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("jockey is talking");
});

app.listen(port, () => {
  console.log(`Jockey is using mic at port ${port}`);
});
