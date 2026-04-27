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
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    isEphemeral: { type: Boolean, default: false }, // NEW FLAG
    createdAt: { type: Date, default: Date.now, expires: '30d' }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// --- API Endpoints ---

// 1. POST: Save an encrypted wishlist
app.post('/api/wishlists', async (req, res) => {
    try {
        const { iv, ciphertext, isEphemeral } = req.body; // Accept the new flag

        if (!iv || !ciphertext) {
            return res.status(400).json({ error: 'Missing encryption parameters' });
        }

        const newList = new Wishlist({ iv, ciphertext, isEphemeral });
        const savedList = await newList.save();

        res.status(201).json({ id: savedList._id });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. GET: Retrieve an encrypted wishlist by its ID
app.get('/api/wishlists/:id', async (req, res) => {
    try {
        const list = await Wishlist.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'Wishlist not found, or it was already viewed and destroyed.' });
        }

        // Capture the data we need to send
        const responseData = { iv: list.iv, ciphertext: list.ciphertext };

        // Self-Destruct Sequence
        if (list.isEphemeral) {
            await Wishlist.findByIdAndDelete(req.params.id);
            console.log(`💥 Ephemeral list ${req.params.id} has been destroyed.`);
        }

        res.status(200).json(responseData);
    } catch (error) {
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