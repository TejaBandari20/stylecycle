const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// ================= AWS CONFIG =================
AWS.config.update({ region: 'eu-north-1' }); // 🔥 IMPORTANT (your region)

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

// 👉 Replace with your actual SNS ARN (same region)
const SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:367553824826:stylecycle";

// ================= APP =================
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ STATIC FIX (VERY IMPORTANT)
app.use(express.static(__dirname));

// ================= ROUTES =================

// Home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Signup page
app.get('/Signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'Signup.html'));
});

// Login page
app.get('/Login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Login.html'));
});

// User Home
app.get('/Home', (req, res) => {
    res.sendFile(path.join(__dirname, 'userhome.html'));
});

// Donate page
app.get('/EventRegister', (req, res) => {
    res.sendFile(path.join(__dirname, 'EventRegister.html'));
});

// ================= SIGNUP =================
app.post('/signup', async (req, res) => {
    const { email, password, username, mobile } = req.body;

    if (!email || !password || !username || !mobile) {
        return res.status(400).json({ message: "All fields required" });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);

        await dynamodb.put({
            TableName: 'Users_d', // ✅ FIXED
            Item: {
                UserId: uuidv4(),
                email: email,
                password: hashed,
                username: username,
                mobile: mobile
            }
        }).promise();

        res.json({ message: "Signup successful" });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ message: "Signup error" });
    }
});

// ================= LOGIN =================
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const data = await dynamodb.scan({
            TableName: 'Users_d' // ✅ FIXED
        }).promise();

        const user = data.Items.find(u => u.email === email);

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: "Wrong password" });
        }

        res.json({
            message: "Login success",
            userId: user.UserId,
            username: user.username
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Login error" });
    }
});

// ================= DONATE =================
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/donate', upload.single('image'), async (req, res) => {
    try {
        const donation = {
            donationId: uuidv4(),
            userId: req.body.userId,
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            quantity: parseInt(req.body.quantity),
            image: req.file.buffer.toString('base64')
        };

        await dynamodb.put({
            TableName: 'Donations_d', // ✅ FIXED
            Item: donation
        }).promise();

        await sns.publish({
            Message: `New Donation: ${donation.title}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: "Donation added" });

    } catch (err) {
        console.error("Donate Error:", err);
        res.status(500).json({ message: "Donation error" });
    }
});

// ================= GET POSTS =================
app.get('/api/posts', async (req, res) => {
    try {
        const data = await dynamodb.scan({
            TableName: 'Donations_d' // ✅ FIXED
        }).promise();

        res.json(data.Items);

    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// ================= CLAIM =================
app.post('/api/claim', async (req, res) => {
    try {
        const claim = {
            claimId: uuidv4(),
            donationId: req.body.donationId,
            userId: req.body.userId
        };

        await dynamodb.put({
            TableName: 'Claims_d', // ✅ FIXED
            Item: claim
        }).promise();

        await sns.publish({
            Message: `New claim for ${claim.donationId}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: "Claim success" });

    } catch (err) {
        console.error("Claim Error:", err);
        res.status(500).json({ message: "Claim error" });
    }
});

// ================= SERVER =================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});