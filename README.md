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


