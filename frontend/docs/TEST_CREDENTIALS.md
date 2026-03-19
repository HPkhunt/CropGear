# Test Login Credentials

Use these credentials to test each login portal. You'll need to create these accounts in the MongoDB database first.

## Test User Accounts

### 🚜 Farmer Test Account
```
Email:    farmer@cropgear.com
Password: farmer123!
Role:     farmer
Name:     John Farmer
```

### 🏢 Equipment Owner Test Account
```
Email:    owner@cropgear.com
Password: owner123!
Role:     equipment_owner
Name:     Sarah Owner
```

### ⚙️ Admin Test Account
```
Email:    admin@cropgear.com
Password: admin123!
Role:     admin
Name:     Admin User
```

---

## How to Add Test Users to MongoDB

### Option 1: Using MongoDB Compass or Atlas UI

1. Connect to your MongoDB database
2. Find the `users` collection (or create it)
3. Insert these documents as JSON:

```json
{
  "_id": ObjectId(),
  "full_name": "John Farmer",
  "email": "farmer@cropgear.com",
  "password": "farmer123!",
  "role": "farmer",
  "created_at": new Date(),
  "is_verified": true
}
```

```json
{
  "_id": ObjectId(),
  "full_name": "Sarah Owner",
  "email": "owner@cropgear.com",
  "password": "owner123!",
  "role": "equipment_owner",
  "created_at": new Date(),
  "is_verified": true
}
```

```json
{
  "_id": ObjectId(),
  "full_name": "Admin User",
  "email": "admin@cropgear.com",
  "password": "admin123!",
  "role": "admin",
  "created_at": new Date(),
  "is_verified": true
}
```

### Option 2: Using MongoDB Shell

Connect to your MongoDB and run:

```javascript
// Insert Farmer
db.users.insertOne({
  full_name: "John Farmer",
  email: "farmer@cropgear.com",
  password: "farmer123!",
  role: "farmer",
  created_at: new Date(),
  is_verified: true
})

// Insert Equipment Owner
db.users.insertOne({
  full_name: "Sarah Owner",
  email: "owner@cropgear.com",
  password: "owner123!",
  role: "equipment_owner",
  created_at: new Date(),
  is_verified: true
})

// Insert Admin
db.users.insertOne({
  full_name: "Admin User",
  email: "admin@cropgear.com",
  password: "admin123!",
  role: "admin",
  created_at: new Date(),
  is_verified: true
})
```

### Option 3: Using Python Script

If your backend has a script folder, create `add_test_users.py`:

```python
from pymongo import MongoClient
from datetime import datetime
from passlib.context import CryptContext

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["cropgear"]
users_collection = db["users"]

# Hash passwords (use your actual password hashing method)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

test_users = [
    {
        "full_name": "John Farmer",
        "email": "farmer@cropgear.com",
        "password": pwd_context.hash("farmer123!"),
        "role": "farmer",
        "created_at": datetime.now(),
        "is_verified": True
    },
    {
        "full_name": "Sarah Owner",
        "email": "owner@cropgear.com",
        "password": pwd_context.hash("owner123!"),
        "role": "equipment_owner",
        "created_at": datetime.now(),
        "is_verified": True
    },
    {
        "full_name": "Admin User",
        "email": "admin@cropgear.com",
        "password": pwd_context.hash("admin123!"),
        "role": "admin",
        "created_at": datetime.now(),
        "is_verified": True
    }
]

# Clear existing test users
users_collection.delete_many({"email": {"$in": [u["email"] for u in test_users]}})

# Insert test users
result = users_collection.insert_many(test_users)
print(f"✅ Inserted {len(result.inserted_ids)} test users")

for user in test_users:
    print(f"  - {user['full_name']} ({user['role']}) -> {user['email']}")
```

---

## Testing Steps

### 1. Add Test Users to Database
Use one of the three methods above to create the test accounts in MongoDB.

### 2. Test Farmer Portal
- **URL:** http://localhost:5174/web/farmer-login
- **Email:** farmer@cropgear.com
- **Password:** farmer123!
- **Expected:** Should redirect to `/farmer/dashboard` ✅

### 3. Test Equipment Owner Portal
- **URL:** http://localhost:5174/web/owner-login
- **Email:** owner@cropgear.com
- **Password:** owner123!
- **Expected:** Should redirect to `/owner/dashboard` ✅

### 4. Test Admin Portal
- **URL:** http://localhost:5174/web/admin-login
- **Email:** admin@cropgear.com
- **Password:** admin123!
- **Expected:** Should redirect to `/admin/dashboard` ✅

### 5. Test Generic Login
- **URL:** http://localhost:5174/web/auth/login
- **Email:** farmer@cropgear.com
- **Password:** farmer123!
- **Expected:** Should auto-detect role and redirect to appropriate dashboard ✅

---

## Role Validation Testing

### Test Cross-Portal Access Prevention
1. Go to `/farmer-login`
2. Enter owner credentials: `owner@cropgear.com` / `owner123!`
3. Should show error: ❌ "This login is for equipment owners only. Please use the correct login portal."

### Test Wrong Role in Owner Portal
1. Go to `/owner-login`
2. Enter farmer credentials: `farmer@cropgear.com` / `farmer123!`
3. Should show error: ❌ "This login is for equipment owners only. Please use the correct login portal."

### Test Wrong Role in Admin Portal
1. Go to `/admin-login`
2. Enter farmer credentials: `farmer@cropgear.com` / `farmer123!`
3. Should show error: ❌ "This login is for administrators only. Unauthorized access attempt."

---

## Password Security Notes

⚠️ **Important for Production:**
- These are test passwords only
- Never use these in production
- Always hash passwords before storing in database
- Use bcrypt, argon2, or similar hashing algorithms
- The backend should hash passwords on registration/creation

---

## If Backend Uses Password Hashing

If your backend already hashes passwords (recommended), you'll need to hash these passwords before inserting:

**Using bcrypt (Python example):**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("farmer123!")
print(hashed)  # Use this hashed value in database
```

**Using Node.js:**
```javascript
const bcrypt = require('bcrypt');
const salt = 10;
const hashed = await bcrypt.hash("farmer123!", salt);
console.log(hashed);  // Use this hashed value in database
```

---

## Troubleshooting

### "Invalid email or password" error
- ❌ Check if user exists in MongoDB with exact email
- ❌ Check if password is stored correctly (hashed or plain)
- ❌ Ensure authService is querying the correct collection

### "This login is for [role] only"
- ✅ This is correct behavior - role validation is working
- Use the correct portal for that role

### Login page won't load
- Check if `/farmer-login`, `/owner-login`, `/admin-login` routes exist
- Check browser console for errors (F12)
- Verify dev server is running: `npm run dev`

### Backend connection issues
- Check MongoDB is running
- Verify connection string in backend config
- Check if authService API endpoint is correct
- Look at backend logs for errors

---

## Quick Reference Card

| Role | Email | Password | Portal | Dashboard |
|------|-------|----------|--------|-----------|
| 🚜 Farmer | farmer@cropgear.com | farmer123! | /farmer-login | /farmer/dashboard |
| 🏢 Owner | owner@cropgear.com | owner123! | /owner-login | /owner/dashboard |
| ⚙️ Admin | admin@cropgear.com | admin123! | /admin-login | /admin/dashboard |

---

**Status:** Ready to test ✅
**Created:** 2024
