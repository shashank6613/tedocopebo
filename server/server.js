// ==========================================
// PERSONAL BOOK APPLICATION - BACKEND SERVER
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
// AWS SDK v3 for Node.js
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
// AWS SDK v3 for Node.js - NOW USING SES INSTEAD OF LAMBDA
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// --- CONFIGURATION SECTION ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; 
const JWT_SECRET = process.env.JWT_SECRET; 
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME || "personal-book-slack-notifier";

// Initial Master Admin Credentials
const INITIAL_MASTER_EMAIL = "admin@example.com";
const INITIAL_MASTER_PASS = "admin123";

const app = express();
// INITIALIZE SES CLIENT
const sesClient = new SESClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });

app.use(cors());
app.use(express.json());


// --- MONGODB DATA MODELS ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true }, 
  password: { type: String },
  secretId: { type: String }, 
  role: { type: String, enum: ['master', 'user'], default: 'user' },
  registeredAt: { type: String, default: () => new Date().toLocaleString() }
});
const User = mongoose.model('User', userSchema);

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  about: {
    name: { type: String, default: "New User" },
    bio: { type: String, default: "Bio goes here..." },
    image: { type: String, default: "https://api.dicebear.com/7.x/avataaars/svg?seed=New" }
  },
  education: [{ id: Number, level: String, name: String, year: String, grade: String }],
  learnings: [{ id: Number, title: String, issuer: String, date: String }],
  projects: [{ id: Number, name: String, stack: String, desc: String, image: String }],
  interests: [{ id: Number, text: String }],
  wishlist: [{ id: Number, text: String, image: String }]
});
const Profile = mongoose.model('Profile', profileSchema);

// --- UTILS ---
const seedMasterAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'master' });
    if (!adminExists) {
      const newAdmin = new User({
        username: "Master Admin",
        email: INITIAL_MASTER_EMAIL,
        password: INITIAL_MASTER_PASS,
        role: 'master',
        secretId: "MASTER"
      });
      await newAdmin.save();
      console.log(`👑 Master Admin created`);
    }
  } catch (err) {
    console.error("Seed Admin Error:", err);
  }
};


// NEW: FUNCTION TO SEND EMAIL VIA SES
const sendRegistrationEmail = async (recipientEmail, username, secretId) => {
    if (!SENDER_EMAIL_ADDRESS) {
        console.error("SES Error: SENDER_EMAIL_ADDRESS environment variable is not set.");
        return;
    }

    const sendCommand = new SendEmailCommand({
        Destination: {
            ToAddresses: [recipientEmail],
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: `
                        <html>
                        <body>
                            <h2>Welcome to Personal Book, ${username}!</h2>
                            <p>Your master admin has successfully registered you.</p>
                            <p>Use the following details to log in:</p>
                            <p><strong>Email:</strong> ${recipientEmail}</p>
                            <p><strong>Secret User ID:</strong> <code>${secretId}</code></p>
                            <br/>
                            <p>This is your unique ID to access and manage your profile.</p>
                        </body>
                        </html>
                    `,
                },
                Text: {
                    Charset: "UTF-8",
                    Data: `Welcome to Personal Book, ${username}! Your Secret User ID is: ${secretId}. Use this to log in.`,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Your Personal Book Registration Details",
            },
        },
        Source: SENDER_EMAIL_ADDRESS, // MUST be an SES verified email address
    });

    try {
        await sesClient.send(sendCommand);
        console.log(`✉️ Registration email sent successfully to ${recipientEmail}`);
    } catch (err) {
        console.error(`❌ SES Failed to send email to ${recipientEmail}:`, err);
        throw new Error(`SES_FAILURE: ${err.message}`);
    }
};


// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// 1. LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password, secretId, type } = req.body; 
  try {
    let user;
    if (type === 'master') {
      user = await User.findOne({ email, role: 'master' });
      if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid Admin Credentials' });
      const token = jwt.sign({ role: 'master', id: user._id, username: user.username }, JWT_SECRET);
      return res.json({ token, role: 'master', username: user.username });
    } else {
      user = await User.findOne({ email: email, secretId: secretId, role: 'user' });
      if (!user) return res.status(401).json({ message: 'Invalid Email or User ID' });
      const token = jwt.sign({ role: 'user', id: user.secretId, username: user.username }, JWT_SECRET);
      return res.json({ token, role: 'user', username: user.username, id: user.secretId });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. GET ALL USERS
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }, 'username email registeredAt secretId'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. REGISTER NEW USER (Triggers Lambda)
app.post('/api/users/register', authenticateToken, async (req, res) => {
  if (req.user.role !== 'master') return res.sendStatus(403);

  const { username, email } = req.body;
  const newId = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const newUser = new User({ username, email, secretId: newId, role: 'user' });
    await newUser.save();

    const defaultProfile = new Profile({
      userId: newId,
      about: { name: username },
      education: [], learnings: [], projects: [], interests: [], wishlist: []
    });
    await defaultProfile.save();

    // --- SEND REGISTRATION EMAIL VIA SES ---
    await sendRegistrationEmail(email, username, newId);
    // ---------------------------------------

    res.status(201).json(newUser);
    } catch (err) {
        // 🚨 Check for our custom SES error or the MongoDB error
        if (err.message.includes("SES_FAILURE")) {
            console.error("Critical SES failure during registration:", err);
            // Delete the saved user and profile here if SES failure is critical
            await User.deleteOne({ secretId: newId });
            await Profile.deleteOne({ userId: newId });
            return res.status(500).json({ error: "Registration failed. Email service rejected the request. Check CloudWatch logs for details." });
        }
        // Catches the MongoDB unique email constraint error, or any other unexpected error
        res.status(500).json({ error: "Registration failed. Email might already exist." });
    }
});

// 4. DELETE USER
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'master') return res.sendStatus(403);
    try {
        await User.deleteOne({ secretId: req.params.id });
        await Profile.deleteOne({ userId: req.params.id });
        res.json({ message: "User deleted successfully" });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

// 5. PROFILE ROUTES
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/profile/:userId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'master' && req.user.id !== req.params.userId) return res.sendStatus(403);
  try {
    const updatedProfile = await Profile.findOneAndUpdate({ userId: req.params.userId }, req.body, { new: true });
    res.json(updatedProfile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

console.log("Trying to connect to MongoDB:", process.env.MONGO_URI);


// --- SERVER STARTUP ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedMasterAdmin();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
