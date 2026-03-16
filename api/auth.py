from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import mysql.connector
from mysql.connector import Error
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from typing import Optional

router = APIRouter()


# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            password=os.getenv('MYSQL_PASSWORD', ''),
            database=os.getenv('MYSQL_DATABASE', 'ai_image')
        )
        if connection.is_connected():
            return connection
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

def init_users_table():
    """Initialize users table if it doesn't exist"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """)
        
        connection.commit()
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database initialization error: {str(e)}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# Initialize users table
init_users_table()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=Token)
async def register_user(user: UserCreate):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check if username or email already exists
        cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", 
                      (user.username, user.email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username or email already registered")

        # Hash the password
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())

        # Insert new user
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (user.username, user.email, hashed_password.decode('utf-8'))
        )
        connection.commit()

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "username": user.username}

    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@router.post("/login", response_model=Token)
async def login_user(user: UserLogin):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Get user by email
        cursor.execute("SELECT * FROM users WHERE email = %s", (user.email,))
        db_user = cursor.fetchone()

        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not bcrypt.checkpw(user.password.encode('utf-8'), 
                            db_user['password'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "username": db_user['username']}

    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
