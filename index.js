const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nvqqk2a.mongodb.net/?retryWrites=true&w=majority`;

// middleware
app.use(cors());
app.use(express.json());

// verify JWT middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  let client;
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();

    const instructorsCollection = client.db("rjDB").collection("instructors");
    const classesCollection = client.db("rjDB").collection("classes");
    const usersCollection = client.db("rjDB").collection("users");
    const enrollmentsCollection = client.db("rjDB").collection("enrollments");
    const classdataCollection = client.db("rjDB").collection("classdata");

    // JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // Classes
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Instructors
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // Users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already has an account" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Selected class
    app.get("/enrollments", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await enrollmentsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/enrollments", async (req, res) => {
      const item = req.body;
      const result = await enrollmentsCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/enrollments/:id", async (req, res) => {
      const id = req.params.id;
      console.log("ID:", id);

      const query = { _id: new ObjectId(id) };
      const result = await enrollmentsCollection.deleteOne(query);
      console.log("Delete Result:", result);

      res.send(result);
    });

    // Get user by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Check if user is an instructor
    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user) {
        return res.send({ instructor: false });
      }
      const isInstructor = user.role === "instructor";
      res.send({ instructor: isInstructor });
    });

    // Make user an instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Check if user is an admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      // Get user by email
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (!user) {
        return res.send({ admin: false });
      }
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // Make user an admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Save pending class
    app.post("/classdata", async (req, res) => {
      console.log(req.decoded);
      const list = req.body;
      const result = await classdataCollection.insertOne(list);
      res.send(result);
    });

    app.get("/classdata/:email", async (req, res) => {
      const email = req.params.instructorEmail;
      const query = { email: email };
      const result = await classdataCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/classdata", async (req, res) => {
      const result = await classdataCollection.find().toArray();
      res.send(result);
    });

    app.put("/classdata/:id", async (req, res) => {
      try {
        const status = req.body.status;

        const filter = { _id: new ObjectId(req.params.id) };
        const updateDoc = {
          $set: { status: status },
        };

        const result = await classdataCollection.updateOne(filter, updateDoc);

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.patch("/classdata/:id", async (req, res) => {
      try {
        const attendance = req.body.attendance;

        const filter = { _id: new ObjectId(req.params.id) };
        const updateDoc = {
          $set: { attendance: attendance },
        };

        const result = await classdataCollection.updateOne(filter, updateDoc);

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/payments", (req, res) => {
      const insertedId = savePaymentInformation(req.body);

      if (insertedId) {
        res.json({ success: true, insertedId });
      } else {
        res.json({
          success: false,
          message: "Failed to save payment information",
        });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price * 100,
          currency: "usd",
        });

        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to create payment intent" });
      }
    });

    app.get("/payments/history", async (req, res) => {
      try {
        const paymentHistory = await Payment.find();

        res.json(paymentHistory);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        res
          .status(500)
          .json({ error: "An error occurred while fetching payment history" });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);
