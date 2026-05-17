# CipherNote 🗒️🔒

**CipherNote** is an end-to-end encrypted, server-blind note sharing platform developed for the **EC7201 Information Security** continuous project.

The system demonstrates a secure communication mechanism between two untrusted parties: a note sender and a recipient. The backend is treated as an untrusted storage server. It stores only encrypted data and verification metadata, not plaintext notes or decryption keys.

---

## 1. Security Goal

CipherNote allows a user to create a private note and share it through a secure link.

The design aims to provide:

| Property | How CipherNote addresses it |
|---|---|
| Confidentiality | Note is encrypted in the browser using AES-256-GCM before upload |
| Integrity | AES-GCM authentication and RSA-PSS signature verification detect tampering |
| Authentication / key binding | Public-key fingerprint is included in the URL fragment to prevent server-side public-key substitution |
| Server blindness | Backend stores only ciphertext, IV, public key, fingerprint, and signature |
| Data minimization | Optional burn-after-reading and 30-day automatic expiry |
| Availability hardening | API rate limiting, request size limits, validation, and security headers |
| PIN protection | Optional Vault PIN/passphrase is hashed with bcrypt and checked before ciphertext retrieval |

> Important clarification: CipherNote uses "zero-knowledge" in the practical server-blind sense. It does not implement a formal zero-knowledge proof protocol.

---

## 2. Threat Model

### Trusted components

- The user's browser runtime
- Native Web Crypto API
- The secure share channel chosen by the user

### Untrusted components

- Backend server
- Database
- Network path
- Unknown users trying to guess PINs or enumerate links

### Considered attacks and mitigations

| Attack | Mitigation |
|---|---|
| Database leak | Database contains ciphertext only; no AES key or plaintext |
| Malicious backend reads data | Backend never receives URL fragment key |
| Ciphertext tampering | RSA-PSS signature verification and AES-GCM authentication fail |
| Public-key substitution by server | Public-key fingerprint is included in the URL fragment |
| PIN brute-force | Rate limiting and bcrypt-hashed PIN/passphrase |
| ID enumeration | Random 192-bit share IDs instead of MongoDB object IDs |
| Storage spam / DoS | Request size limit and POST/GET rate limiting |
| One-time link race | Burn-after-reading uses atomic `findOneAndDelete` on successful access |
| Overly permissive browser access | CORS restricted to configured frontend origin |

---

## 3. Cryptographic Design

### 3.1 Note encryption

1. Browser generates a fresh 256-bit AES-GCM key.
2. Browser generates a random 12-byte IV.
3. Note text is encrypted locally.
4. Backend receives only:
   - `iv`
   - `ciphertext`
   - `publicKey`
   - `publicKeyFingerprint`
   - `signature`

### 3.2 Share link format

```text
/list/:shareId#AES_KEY.PUBLIC_KEY_FINGERPRINT
```

The fragment after `#` is not sent to the backend by normal HTTP requests. The recipient browser uses it locally.

### 3.3 Signature flow

1. Browser creates an RSA-PSS key pair.
2. Browser signs a canonical payload:

```json
{
  "version": 1,
  "iv": "...",
  "ciphertext": "..."
}
```

3. Browser stores the public key and signature with the ciphertext.
4. Recipient browser:
   - hashes the received public key
   - compares it with the fingerprint in the URL fragment
   - verifies the RSA-PSS signature
   - decrypts only if verification succeeds

This prevents an untrusted server from replacing the ciphertext, public key, and signature together.

---

## 4. Updated Project Structure

```text
ciphernote/
├── backend/
│   ├── .env.example
│   ├── index.js
│   └── package.json
│
├── frontend/
│   ├── .env.local.example
│   ├── app/
│   │   ├── page.tsx
│   │   └── list/
│   │       └── [id]/
│   │           └── page.tsx
│   └── utils/
│       └── crypto.ts
│
└── README.md
```

---

## 5. Local Setup

### 5.1 Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Example `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ciphernote
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
```

### 5.2 Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Example `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Open:

```text
http://localhost:3000
```

---

## 6. Demonstration Plan

### Demo 1: Normal secure sharing

1. Create note.
2. Generate secure link.
3. Open link as recipient.
4. Show that verification happens before decryption.

### Demo 2: Server cannot read plaintext

1. Inspect MongoDB record.
2. Show that only ciphertext, IV, signature, and public key are stored.
3. Confirm no plaintext note or AES key exists in the backend.

### Demo 3: Tamper detection

1. Modify one character of ciphertext in MongoDB.
2. Open secure link.
3. Show signature or decryption failure.

### Demo 4: Public-key substitution prevention

1. Explain that if the server replaces public key + signature, basic signature verification alone is not enough.
2. Show that CipherNote compares the public-key fingerprint in the URL fragment.
3. Mismatch blocks decryption.

### Demo 5: PIN protection

1. Create a PIN-protected note.
2. Try wrong PIN.
3. Show access denied.
4. Try correct PIN.
5. Show successful decryption.

### Demo 6: Burn-after-reading

1. Create burn-after-reading note.
2. Open once successfully.
3. Open again.
4. Show that the encrypted record has been consumed.

---

## 7. Known Limitations

- Anyone with the full secure link can decrypt the note.
- Browser extensions, clipboard managers, screenshots, or unsafe sharing channels can leak the fragment key.
- This is not a formal zero-knowledge proof system.
- If the recipient device is compromised, local plaintext can be stolen after decryption.
- bcrypt is acceptable for the prototype, but Argon2id would be preferred for production password/passphrase hashing.
- HTTPS is required in production.

---

## 8. Recommended Production Improvements

- Deploy only over HTTPS.
- Use Argon2id for Vault passphrase hashing.
- Add persistent per-list lockout after repeated failed PIN attempts.
- Add a revocation feature for non-ephemeral links.
- Add user-selected expiry durations.
- Add automated security tests.
- Add dependency scanning and SAST in GitHub Actions.

---

## 9. Academic Mapping

This project demonstrates:

- Symmetric-key encryption: AES-GCM
- Asymmetric cryptography: RSA-PSS signatures
- Hash functions: SHA-256 public-key fingerprinting
- Authentication and integrity checking
- Secure protocol design between untrusted parties
- CIA triad analysis
- Threat modeling and mitigation
- Practical implementation using a high-level language

---

## 10. Important Viva Points

Use these answers during the oral examination:

**Why AES-GCM?**  
AES-GCM provides authenticated encryption. It protects confidentiality and also detects ciphertext tampering.

**Why URL fragment?**  
The URL fragment is handled client-side and is not normally sent in HTTP requests to the backend. Therefore, the server does not receive the AES key.

**Why public-key fingerprint in the fragment?**  
Without it, a malicious server could replace the ciphertext, public key, and signature together. The fingerprint binds the trusted public key to the out-of-band secure link.

**Is this a formal zero-knowledge proof?**  
No. It is a server-blind zero-knowledge architecture, meaning the server has no knowledge of plaintext or encryption keys.

**What happens if the database is leaked?**  
The attacker obtains ciphertext and metadata, but not the AES key. Without the full secure link, note contents remain confidential.

**What is the biggest limitation?**  
The secure link is a bearer secret. Anyone who obtains the complete link can decrypt the note, so the link must be shared through a trusted channel.
