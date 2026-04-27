# CipherWish 🎁🔒

> **An end-to-end encrypted, zero-knowledge wishlist sharing platform.**

CipherWish lets users create and share wishlists without exposing their personal preferences or plans to the server. All encryption happens in the browser, so the backend only stores ciphertext and never sees the plaintext list or decryption key.

## 🛡️ The Security Model (Zero-Knowledge Architecture)

CipherWish is built on a zero-trust architecture.
1. **Client-Side Encryption:** When a user creates a wishlist, the browser generates a cryptographically strong 256-bit key using the native Web Crypto API. The wishlist is encrypted locally using **AES-GCM**.
2. **Untrusted Server:** Only the resulting ciphertext and the Initialization Vector (IV) are sent to the backend. The backend (Node.js/MongoDB) does not hold the encryption key or any user passwords.
3. **URL-Fragment Key Exchange:** The encryption key is exported as a Hex string and appended to the shareable URL as a fragment (e.g., `https://cipherwish.com/list/123#KEY`). Because browsers **do not** send URL fragments to the server, the server never sees the key. The recipient's browser downloads the ciphertext, grabs the key from the URL, and decrypts the wishlist locally.

## 🚀 Tech Stack

* **Frontend:** Next.js (React), TypeScript, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Cryptography:** Native Web Crypto API (AES-GCM)

## ✨ Highlights

* Client-side encryption and signature verification.
* Optional PIN protection for shared wishlists.
* Burn-after-reading support for one-time access.
* A clean UI with copy-to-clipboard icon actions and a compact project footer.

## 💻 Local Setup & Installation

**Prerequisites:** Node.js installed and a MongoDB database (local or Atlas).

**1. Clone the repository:**
```bash
git clone https://github.com/nostoc/cipherwish.git
cd cipherwish
```

**2. Setup the Backend (Untrusted Server):**
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory and add your MongoDB URI:
```env
MONGODB_URI=your_mongodb_connection_string_here
PORT=5000
```
Start the server:
```bash
npm start
```

**3. Setup the Frontend (Client):**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` to create your first secure wishlist!

## 📁 Project Structure

* `frontend/` - Next.js application with the wishlist composer and public share views.
* `backend/` - Express API that stores encrypted wishlist payloads.
* `LICENSE` - Apache 2.0 license for the project.

## 🎓 Academic Disclaimer
This project was developed as part of an Information Security module to demonstrate practical implementations of the CIA triad, threat modeling, and modern cryptographic protocols.

## ⚖️ License
Distributed under the Apache 2.0 License. See `LICENSE` for more information.
