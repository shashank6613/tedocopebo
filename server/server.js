// ==========================================
// PERSONAL BOOK APPLICATION - BACKEND SERVER
// ==========================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { randomUUID } = require('crypto');

// --- CONFIGURATION SECTION ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const AWS_REGION = process.env.AWS_REGION || "us-west-2";

const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS; // Keep for now, but not used

// Initial Master Admin Credentials
const INITIAL_MASTER_EMAIL = "shashank@gmail.com";
const INITIAL_MASTER_PASS = "admin123";

const app = express();
// REMOVED: INITIALIZE SES CLIENT
// const sesClient = new SESClient({ region: AWS_REGION });
// const lambdaClient = new LambdaClient({ region: AWS_REGION });

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
    publicLinkKey: { type: String, unique: true },
    about: {
        name: { type: String, default: "New User" },
        bio: { type: String, default: "Bio goes here..." },
        image: { type: String, default: "https://api.dicebear.com/7.x/avataaars/svg?seed=New" }
    },
    education: [{ id: Number, level: String, name: String, year: String, grade: String }],
    learnings: [{ id: Number, title: String, issuer: String, date: String }],
    projects: [{ id: Number, name: String, stack: String, desc: String, image: String }],
    interests: [{ id: Number, text: String }],
    wishlist: [{ id: Number, text: String, image: String }],
    tours: [{ id: Number, image: String, details: String }], // My tours
    bestPics: [{ id: Number, image: String }], // My Best Pictours: [{ id: Number, image: String, details: String }]
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


// REMOVED: FUNCTION TO SEND EMAIL VIA SES
// We replace this with a placeholder to avoid the SES Sandbox issue.
const sendRegistrationNotification = (username, secretId) => {
    console.log(`✉️ SUCCESS: User ${username} registered. Admin must provide Secret ID: ${secretId} to the user.`);
    // You would use a 3rd party tool here if re-implementing email later.
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

// 1. LOGIN (Existing)
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

// REMOVED: 2. GET ALL USERS (Replaced by new protected /api/users/list)

// NEW: 2a. GET ALL NON-MASTER USERS (ADMIN PANEL)
app.get('/api/users/list', authenticateToken, async (req, res) => {
    if (req.user.role !== 'master') {
        return res.status(403).json({ error: 'Forbidden. Master Admin access required.' });
    }

    try {
        // Fetch all users excluding the 'master' admin.
        const users = await User.find({ role: 'user' }).select('username email secretId role registeredAt');

        res.status(200).json(users);
    } catch (err) {
        console.error('Error fetching user list:', err);
        res.status(500).json({ error: 'Failed to retrieve user list.' });
    }
});


// 3. REGISTER NEW USER (Updated)
app.post('/api/users/register', authenticateToken, async (req, res) => {
    if (req.user.role !== 'master') return res.sendStatus(403);

    const { username, email } = req.body;
    const newId = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        const newUser = new User({ username, email, secretId: newId, role: 'user' });
        await newUser.save();

        // 🚨 MODIFIED: Generate the Public Link Key (PLK) here
        const newPublicLinkKey = randomUUID();

        const defaultProfile = new Profile({
            userId: newId,
            about: { name: username },
            education: [], learnings: [], projects: [], interests: [], wishlist: []
        });
        await defaultProfile.save();

        // --- NEW NOTIFICATION LOGIC (REPLACES SES) ---
        sendRegistrationNotification(username, newId);
        // ---------------------------------------------

        res.status(201).json(newUser);
    } catch (err) {
        // Since we removed email functionality, we only handle the MongoDB unique email error or general error.
        console.error("User registration error:", err);
        // Note: MongoDB unique error has code 11000
        if (err.code === 11000) {
            return res.status(409).json({ error: "Registration failed. Email already exists." });
        }
        res.status(500).json({ error: "Registration failed due to server error." });
    }
});

// NEW: 4. DELETE USER (Uses secretId, replaces old /api/users/:id route)
app.delete('/api/users/:secretId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'master') return res.sendStatus(403);

    const { secretId } = req.params;

    try {
        // 1. Delete the User and the corresponding Profile
        const userResult = await User.deleteOne({ secretId: secretId });
        const profileResult = await Profile.deleteOne({ userId: secretId });

        if (userResult.deletedCount === 0) {
            return res.status(404).json({ error: `User with ID ${secretId} not found.` });
        }

        res.status(200).json({ message: `User with ID ${secretId} and profile deleted successfully.` });
    } catch (err) { 
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user and profile.' }); 
    }
});

// 5. PROFILE ROUTES (Existing)
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

// NEW: 6. GET PUBLIC PROFILE BY SECRET ID (UNAUTHENTICATED)
app.get('/api/profile/public/:publicLinkKey', async (req, res) => {
    const { publicLinkKey } = req.params;

    try {
        // 1. Find the Profile using the publicLinkKey
        const profile = await Profile.findOne({ publicLinkKey: publicLinkKey });
        if (!profile) {
            return res.status(404).json({ error: 'Profile data not found.' });
        }

        // 2. Find the User using the Profile's userId (Secret ID)
        const user = await User.findOne({ secretId: profile.userId }).select('username');
        if (!user) {
            return res.status(404).json({ error: 'Associated user not found.' });
        }

        // 3. Return combined public data
        const publicData = {
            username: user.username,
            profile: profile
        };

        res.status(200).json(publicData);

    } catch (err) {
        console.error('Error fetching public profile:', err);
        res.status(500).json({ error: 'Failed to retrieve public profile data.' });
    }
});


console.log("Trying to connect to MongoDB:", process.env.MONGO_URI);


// --- SERVER STARTUP ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        seedMasterAdmin();
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => console.error('❌ MongoDB connection error:', err))
