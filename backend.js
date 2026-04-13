// backend.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const AWS = require('aws-sdk');

// ✅ IAM ROLE BASED CONFIG (NO KEYS)
AWS.config.update({
    region: 'ap-south-1'
});

// DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient();

// SNS
const sns = new AWS.SNS();

// ✅ Replace with your actual SNS Topic ARN
const SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:367553824826:stylecycle";

// JWT Secret
const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

const PORT = 5000;
const app = express();

// --- Middleware ---
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000'
    ]
}));

app.use(bodyParser.json());
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

    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS512'] });
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
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

        res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await dynamodb.query({
            TableName: 'Users',
            IndexName: 'Email-index',
            KeyConditionExpression: 'Email = :email',
            ExpressionAttributeValues: { ':email': email }
        }).promise();

        const user = result.Items[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.UserId, username: user.Username },
            SECRET_KEY,
            { expiresIn: '1h', algorithm: 'HS512' }
        );

        res.json({ token });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- DONATE ---
app.post('/api/donate', authenticateUser, upload.single('image'), async (req, res) => {
    try {
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

        // 🔥 SNS NOTIFICATION
        await sns.publish({
            Message: `New donation added: ${donation.title}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: 'Donation added', donation });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- GET POSTS ---
app.get('/api/posts', async (req, res) => {
    try {
        const data = await dynamodb.scan({
            TableName: 'Donations'
        }).promise();

        res.json(data.Items);

    } catch (err) {
        res.status(500).json({ message: err.message });
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

        // 🔥 SNS NOTIFICATION
        await sns.publish({
            Message: `New claim request for donation ID: ${claim.donationId}`,
            TopicArn: SNS_TOPIC_ARN
        }).promise();

        res.json({ message: 'Claim submitted' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
