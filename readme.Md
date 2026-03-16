# Quizaro Backend

## 📌 About Quizaro

Quizaro is an interactive quiz platform where users can register, log in, and attempt test series through a secure web application.

The backend handles authentication, test series management, questions, and user attempts. It exposes REST APIs that allow the frontend to interact with the database securely.

---

## ⚙️ Backend Implementation

The backend is built using **Node.js** and **Express.js** with a modular architecture.

### Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Cookie-based authentication

---

## 🔐 Authentication Flow

1. User registers using the Register API  
2. User logs in using the Login API  
3. Backend verifies user credentials  
4. JWT token is generated  
5. Token is stored in a secure HTTP-only cookie  
6. Protected routes verify the token using middleware  

---

## 🧩 Project Structure

backend/

config/
- connectDB.js

models/
- user.js
- testSeries.js
- question.js
- attempt.js

controllers/
- userController.js
- testController.js
- questionController.js
- attemptController.js

middlewares/
- isAuth.js

uploads/

server.js

---

## 📂 Folder Explanation

**config/**
- Database connection configuration.

**models/**
- Contains Mongoose schemas for users, test series, questions, and attempts.

**controllers/**
- Contains business logic for handling API requests.

**middlewares/**
- Authentication middleware for protected routes.

**uploads/**
- Stores uploaded files if needed.

**server.js**
- Main entry point of the backend application.

---

## 🔗 GitHub Repository

Backend Source Code:

https://github.com/amors-endeavour/Quizaro-Backend

---

## 🌐 Deployment

The backend will be deployed using Render.

Live API URL:

ADD_RENDER_DEPLOYMENT_LINK_HERE

---



## 🧪 API Testing

You can test the APIs using:

- Postman
- Thunder Client
- Insomnia

---

## 👨‍💻 Author

Backend implementation for the **Quizaro Quiz Platform**.
