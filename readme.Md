# Quizaro Backend

## 📌 About Quizaro

**Quizaro** is an interactive quiz platform where users can register, log in, and attempt test series through a secure and scalable web application.

The backend of Quizaro manages authentication, test series, questions, and user attempts. It provides REST APIs that allow the frontend application to communicate with the database and perform various operations such as user registration, login, fetching quizzes, and submitting attempts.

---

## ⚙️ Backend Implementation

The Quizaro backend is implemented using **Node.js** and **Express.js**, following a modular REST API architecture.

### Key Technologies

- **Node.js** – Runtime environment for the backend server
- **Express.js** – Web framework for building APIs
- **MongoDB** – NoSQL database for storing application data
- **Mongoose** – ODM for MongoDB
- **JWT (JSON Web Tokens)** – Secure authentication mechanism
- **Middleware** – Route protection and request validation

---

## 🔐 Authentication Flow

1. User registers using the **Register API**
2. User logs in using the **Login API**
3. Backend verifies credentials
4. A **JWT token** is generated
5. The token is stored in a **secure HTTP-only cookie**
6. Protected routes verify the token using authentication middleware

This ensures that only authenticated users can access protected resources.

---

## 🧩 Project Structure

```
backend/
│
├── config/
│   └── connectDB.js
│
├── models/
│   ├── user.js
│   ├── testSeries.js
│   ├── question.js
│   └── attempt.js
│
├── controllers/
│   ├── userController.js
│   ├── testController.js
│   ├── questionController.js
│   └── attemptController.js
│
├── middlewares/
│   └── isAuth.js
│
├── uploads/
│
└── server.js
```

### Folder Explanation

**config/**
- Contains database connection logic.

**models/**
- Defines MongoDB schemas for the application.
- Includes models for users, test series, questions, and attempts.

**controllers/**
- Handles business logic for each module.
- Processes incoming requests and returns responses.

**middlewares/**
- Contains authentication and route protection middleware.

**uploads/**
- Stores uploaded files if required by the application.

**server.js**
- Entry point of the backend application.

---

## 🔗 GitHub Repository

Backend Source Code:

https://github.com/amors-endeavour/Quizaro-Backend

---

## 🌐 Deployment

The backend will be deployed using **Render**.

Live API URL:

```
https://quizaro-backend-3fkj.onrender.com
```

(Replace the above placeholder with the Render deployment link after deployment.)

---

## 🚀 Running the Project Locally

### 1️⃣ Clone the repository

```
git clone https://github.com/amors-endeavour/Quizaro-Backend.git
```

### 2️⃣ Navigate to the project folder

```
cd Quizaro-Backend
```

### 3️⃣ Install dependencies

```
npm install
```

### 4️⃣ Create `.env` file

Example:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 5️⃣ Start the server

```
node server.js
```

Server will run on:

```
http://localhost:5000
```

---

## 🧪 API Testing

The APIs can be tested using:

- Postman
- Thunder Client
- Insomnia

---

## 👩‍💻 Author

Backend implementation developed for the **Quizaro Quiz Platform**.
