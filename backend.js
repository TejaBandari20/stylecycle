require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// ✅ AWS CONFIG (IAM ROLE)
AWS.config.update({
    region: 'ap-south-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

// ✅ FIXED SNS REGION
const SNS_TOPIC_ARN = "arn:aws:sns:ap-south-1:367553824826:stylecycle";

// JWT
const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

const app = express();
const PORT = 5000;

// ✅ FIXED CORS (ALLOW ALL)
app.use(cors({ origin: '*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- JWT Middleware ---
function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// --- Static Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/Login', (req, res) => res.sendFile(path.join(__dirname, 'Login.html')));
app.get('/Signup', (req, res) => res.sendFile(path.join(__dirname, 'Signup.html')));
app.get('/Home', (req, res) => res.sendFile(path.join(__dirname, 'userhome.html')));

// --- SIGNUP ---
app.post('/signup', async (req, res) => {
    const { email, password, username, mobile } = req.body;

    if (!email || !password || !username || !mobile) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            UserId: uuidv4(),
            Email: email,
            Mobile: mobile,
            password: hashedPassword,
            Username: username.toLowerCase(),
            createdAt: new Date().toISOString()
        };

        await dynamodb.put({
            TableName: 'Users',
            Item: newUser
        }).promise();

        res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // ✅ SAFE LOGIN (NO INDEX REQUIRED)
        const result = await dynamodb.scan({
            TableName: 'Users'
        }).promise();

        const user = result.Items.find(u => u.Email === email);

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { userId: user.UserId, username: user.Username },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ token });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- DONATE ---
app.post('/api/donate', authenticateUser, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image required" });
        }

        const image = req.file.buffer.toString('base64');

        const donation = {
            donationId: uuidv4(),
            userId: req.user.userId,
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            quantity: parseInt(req.body.quantity),
            imageData: image,
            status: 'available',
            postedAt: new Date().toISOString()
        };

        await dynamodb.put({
            TableName: 'Donations',
            Item: donation
        }).promise();

        // SNS Notification
        await sns.publish({
            Message: `New donation: ${donation.title}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: "Donation added", donation });

    } catch (error) {
        console.error("Donate Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- GET POSTS ---
app.get('/api/posts', async (req, res) => {
    try {
        const data = await dynamodb.scan({
            TableName: 'Donations'
        }).promise();

        res.json(data.Items);

    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- CLAIM ---
app.post('/api/claim', authenticateUser, async (req, res) => {
    try {
        const claim = {
            claimId: uuidv4(),
            donationId: req.body.donationId,
            claimerUserId: req.user.userId,
            claimStatus: 'pending',
            claimedAt: new Date().toISOString()
        };

        await dynamodb.put({
            TableName: 'Claims',
            Item: claim
        }).promise();

        await sns.publish({
            Message: `New claim for donation: ${claim.donationId}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: "Claim submitted" });

    } catch (error) {
        console.error("Claim Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});