# Postman Testing Guide - OSDS Appointment API

## 📋 Table of Contents
1. [Import Collection](#import-collection)
2. [Environment Setup](#environment-setup)
3. [Testing Workflow](#testing-workflow)
4. [API Endpoints](#api-endpoints)
5. [Sample Test Data](#sample-test-data)
6. [Common Issues](#common-issues)

---

## 🚀 Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `postman_collection.json` from the server folder
5. Collection will appear in your Postman sidebar

---

## ⚙️ Environment Setup

### Create Environment Variable (Optional but Recommended)

1. Click **Environments** in left sidebar
2. Click **+** to create new environment
3. Name it: `OSDS Local`
4. Add variable:
   - **Variable**: `baseUrl`
   - **Initial Value**: `http://localhost:5200/api`
   - **Current Value**: `http://localhost:5200/api`
5. Click **Save**
6. Select this environment from dropdown (top right)

---

## 🔄 Testing Workflow

### Step 1: Start Server
```bash
cd OSDS-Appointment-Server
npm run dev
```

### Step 2: Test Authentication First
1. **Login** → This sets the httpOnly cookie automatically
2. Check **Cookies** tab (below URL bar) to verify cookie is set
3. All subsequent requests will use this cookie

### Step 3: Test Other Endpoints
- Cookies are automatically sent with requests
- No need to manually add Authorization headers

---

## 📡 API Endpoints

### 🔐 Authentication APIs

#### 1. Login
```
POST /api/users/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Note:** Sets httpOnly cookie automatically

#### 2. Logout
```
POST /api/users/logout
```
**Note:** Clears httpOnly cookie

#### 3. Request Temporary Account
```
POST /api/users/request-temporary-account
```
**Body:**
```json
{
  "email": "newuser@example.com"
}
```

#### 4. Change Password
```
POST /api/users/change-password
```
**Body:**
```json
{
  "userId": 1,
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

#### 5. Register User (Admin)
```
POST /api/users/register
```
**Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "John Doe",
  "contactNumber": "09123456789",
  "positionTitle": "Teacher",
  "unitId": 1,
  "role": "user"
}
```

#### 6. Update User
```
PUT /api/users/updateUser/:id
```
**Body:**
```json
{
  "fullName": "John Updated",
  "contactNumber": "09987654321",
  "positionTitle": "Senior Teacher",
  "unitId": 2,
  "role": "user",
  "isActive": true
}
```

#### 7. Reset Password (Admin)
```
POST /api/users/reset-password/:id
```

---

### 🏢 Unit APIs

#### 1. Get All Units
```
GET /api/units/getAllUnits?isActive=true
```

#### 2. Get Unit By ID
```
GET /api/units/getUnitById/:id
```

#### 3. Create Unit
```
POST /api/units/createUnit
```
**Body:**
```json
{
  "name": "Curriculum and Instruction",
  "description": "Handles curriculum development and instruction",
  "isActive": true
}
```

#### 4. Update Unit
```
PUT /api/units/updateUnit/:id
```
**Body:**
```json
{
  "name": "Updated Unit Name",
  "description": "Updated description",
  "isActive": true
}
```

#### 5. Delete Unit (Soft Delete)
```
DELETE /api/units/deleteUnit/:id
```

#### 6. Delete Unit Permanent
```
DELETE /api/units/deleteUnitPermanent/:id
```

---

### 📅 Appointment APIs

#### 1. Get All Appointments
```
GET /api/appointments/getAllAppointments?status=pending&date=2025-11-30
```
**Query Parameters:**
- `status` (optional): pending, approved, rejected, cancelled
- `date` (optional): YYYY-MM-DD format
- `userId` (optional): Filter by user ID
- `unitId` (optional): Filter by unit ID
- `isDeleted` (optional): true/false

#### 2. Get Appointment By ID
```
GET /api/appointments/getAppointmentById/:id
```

#### 3. Create Appointment (Unauthenticated)
```
POST /api/appointments/createAppointment
```
**Body:**
```json
{
  "fullName": "Jane Smith",
  "unitId": 1,
  "appointmentDate": "2025-11-30T00:00:00.000Z",
  "appointmentStartTime": "2025-11-30T08:00:00.000Z",
  "appointmentEndTime": "2025-11-30T12:00:00.000Z",
  "appointmentStatus": "pending"
}
```
**Note:** Works without authentication (for "Schedule Appointment Now" button)

#### 4. Create Appointment (Authenticated)
```
POST /api/appointments/createAppointment
```
**Body:**
```json
{
  "fullName": "John Doe",
  "unitId": 1,
  "appointmentDate": "2025-11-30T00:00:00.000Z",
  "appointmentStartTime": "2025-11-30T13:00:00.000Z",
  "appointmentEndTime": "2025-11-30T17:00:00.000Z",
  "appointmentStatus": "pending"
}
```
**Note:** 
- Must login first to get cookie
- `userId` is automatically populated from cookie
- If you provide `userId` in body, it will override (for admin booking for others)

#### 5. Create Appointment (Admin - Booking for User)
```
POST /api/appointments/createAppointment
```
**Body:**
```json
{
  "fullName": "Jane Smith",
  "userId": 5,
  "unitId": 1,
  "appointmentDate": "2025-12-01T00:00:00.000Z",
  "appointmentStartTime": "2025-12-01T08:00:00.000Z",
  "appointmentEndTime": "2025-12-01T12:00:00.000Z",
  "appointmentStatus": "pending"
}
```
**Note:** Admin can book for specific user by providing `userId`

#### 6. Update Appointment
```
PUT /api/appointments/updateAppointment/:id
```
**Body:**
```json
{
  "appointmentStatus": "approved",
  "appointmentDate": "2025-12-01T00:00:00.000Z",
  "appointmentStartTime": "2025-12-01T09:00:00.000Z",
  "appointmentEndTime": "2025-12-01T13:00:00.000Z",
  "unitId": 2
}
```

#### 7. Delete Appointment (Soft Delete)
```
DELETE /api/appointments/deleteAppointment/:id
```

#### 8. Delete Appointment Permanent
```
DELETE /api/appointments/deleteAppointmentPermanent/:id
```

---

## 📝 Sample Test Data

### Sample User
```json
{
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Test User",
  "contactNumber": "09123456789",
  "positionTitle": "Teacher",
  "unitId": 1,
  "role": "user"
}
```

### Sample Unit
```json
{
  "name": "Human Resource",
  "description": "Handles human resource management",
  "isActive": true
}
```

### Sample Appointment
```json
{
  "fullName": "John Doe",
  "unitId": 1,
  "appointmentDate": "2025-11-30T00:00:00.000Z",
  "appointmentStartTime": "2025-11-30T08:00:00.000Z",
  "appointmentEndTime": "2025-11-30T12:00:00.000Z",
  "appointmentStatus": "pending"
}
```

### Date Format Examples
- **Date**: `2025-11-30T00:00:00.000Z` (ISO 8601 format)
- **Start Time**: `2025-11-30T08:00:00.000Z` (8:00 AM)
- **End Time**: `2025-11-30T12:00:00.000Z` (12:00 PM)

---

## ⚠️ Common Issues

### 1. Cookies Not Sending
**Problem:** Postman not sending cookies automatically

**Solution:**
- Check **Cookies** tab (below URL bar) - should show cookie after login
- Ensure you're using the same domain (localhost:5200)
- Try logging in again

### 2. CORS Error
**Problem:** CORS policy blocking requests

**Solution:**
- Check server CORS configuration
- Ensure `credentials: true` is set in CORS options
- Verify allowed origins include your frontend URL

### 3. 401 Unauthorized
**Problem:** Getting 401 even after login

**Solution:**
- Check if cookie is set (Cookies tab)
- Try logging in again
- Check server logs for token validation errors

### 4. Time Conflict Error
**Problem:** "Time slot conflict" when creating appointment

**Solution:**
- Check existing appointments for that date
- Use different time slot
- Ensure start time is before end time

### 5. Deadline Error
**Problem:** "Cannot schedule after 2:00 PM"

**Solution:**
- Appointments can only be scheduled before 2:00 PM on weekdays
- Use a future date or earlier time
- Ensure date is a weekday (Monday-Friday)

---

## 🧪 Testing Scenarios

### Scenario 1: Unauthenticated User Booking
1. **Don't login** (or logout first)
2. Create appointment with `fullName` only
3. Should work without `userId`

### Scenario 2: Authenticated User Booking
1. **Login first** to get cookie
2. Create appointment
3. `userId` should be automatically populated from cookie

### Scenario 3: Admin Booking for User
1. Login as admin
2. Create appointment with `userId` in body
3. Appointment linked to specified user

### Scenario 4: Time Conflict Test
1. Create appointment: 8:00 AM - 12:00 PM on Nov 30
2. Try to create another: 10:00 AM - 2:00 PM on Nov 30
3. Should get conflict error

### Scenario 5: Deadline Test
1. Try to create appointment after 2:00 PM today
2. Should get deadline error
3. Use future date or earlier time

---

## 📊 Expected Responses

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 🔍 Viewing Cookies in Postman

1. Click **Cookies** link (below URL bar)
2. Or: **View** → **Show Postman Console**
3. Check **Cookies** tab in console
4. Should see `token` cookie after login

---

## 💡 Tips

1. **Always login first** before testing authenticated endpoints
2. **Check cookies** to verify authentication
3. **Use environment variables** for baseUrl
4. **Save requests** to collection for easy reuse
5. **Use Postman Console** to debug requests/responses
6. **Test error cases** (invalid data, missing fields, etc.)

---

## 📞 Need Help?

- Check server logs for detailed error messages
- Verify database connection
- Ensure all required fields are provided
- Check date/time formats (ISO 8601)

---

**Happy Testing! 🚀**

