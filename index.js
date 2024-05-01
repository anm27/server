const express = require('express');
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const { type } = require('os');
const { url } = require('inspector');
const { request } = require('https');

const app = express();
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "voyger",
  });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let salt_key = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399"
let merchant_id = "PGTESTPAYUAT"

app.get('/', (req, res) => {
    res.send("Hello from SERVER!")
})

// Endpoint for user registration
app.post("/register", async (req, res) => {
    const { name, phone, password } = req.body;
  
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // Insert the user into the database
    connection.query(
      "INSERT INTO users (name, phone, password) VALUES (?, ?, ?)",
      [name, phone, hashedPassword],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        return res.status(201).json({ message: "User registered successfully" });
      }
    );
  });

// Endpoint for user login
app.post("/login", async (req, res) => {
    const { phone, password } = req.body;
  
    // Retrieve user from the database
    connection.query(
      "SELECT * FROM users WHERE phone = ?",
      [phone],
      async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
  
        if (results.length === 0) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
  
        const user = results[0];
  
        // Compare hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
  
        return res.status(200).json({ message: "Login successful", user });
      }
    );
  });

app.post('/order', async (req, res) => {
    try {
        
        let merchantTransactionId = req.body.transactionId

        const data = {
            merchantId: merchant_id,
            merchantTransactionId: merchantTransactionId,
            name: req.body.name,
            amount: req.body.amount * 100,
            // redirectUrl: `http://localhost:8000/status?id=${merchantTransactionId}`,
            redirectUrl: `http://localhost:5173/`,
            redirectMode: "POST",
            mobileNumber: req.body.phone,
            paymentInstrument: {
                type:"PAY_PAGE"
            }
        }

        const payload = JSON.stringify(data)
        const payloadMain = Buffer.from(payload).toString('base64')
        const keyIndex = 1
        const string = payloadMain + '/pg/v1/pay' + salt_key;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        // const prod_URL = "https://api-preprod.phonepe.com/apis/hermes"
        const prod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

        const options = {
            method: 'POST',
            url: prod_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        } 

        await axios(options).then(function (response) {
            console.log(response.data)
            return res.json(response.data)
        }).catch(function (error) {
            console.log(error)
        })

    } catch (error) {
        console.log(error)
    }
})

app.listen(8000, () => {
    console.log("Server is running on port 8000...")
})