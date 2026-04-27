const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows your Next.js frontend to talk to this backend
app.use(express.json()); // Allows the server to accept JSON payloads

// --- Database Schema ---
// Notice: There is NO password or key stored here. Just the Initialization Vector (IV) and Ciphertext.
const wishlistSchema = new mongoose.Schema({
    iv: {
        type: String,
        required: true
    },
    ciphertext: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '30d' // Security Feature: Auto-delete lists after 30 days to limit data exposure
    }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// --- API Endpoints ---

// 1. POST: Save an encrypted wishlist
app.post('/api/wishlists', async (req, res) => {
    try {
        const { iv, ciphertext } = req.body;

        if (!iv || !ciphertext) {
            return res.status(400).json({ error: 'Missing encryption parameters' });
        }

        const newList = new Wishlist({ iv, ciphertext });
        const savedList = await newList.save();

        // Return the auto-generated MongoDB ID to the frontend so it can build the shareable link
        res.status(201).json({ id: savedList._id });
    } catch (error) {
        console.error('Error saving wishlist:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. GET: Retrieve an encrypted wishlist by its ID
app.get('/api/wishlists/:id', async (req, res) => {
    try {
        const list = await Wishlist.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'Wishlist not found or has expired' });
        }

        // Serve the scrambled data to whoever asks for it. 
        // The frontend will handle the decryption using the URL fragment key.
        res.status(200).json({ iv: list.iv, ciphertext: list.ciphertext });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Start the Server ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB (Untrusted Server Ready)');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));