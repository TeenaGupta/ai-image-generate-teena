from dotenv import load_dotenv

import os
from mysql.connector.pooling import MySQLConnectionPool
from mysql.connector import Error
import mysql.connector
import logging
from typing import Optional, Dict, List

from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

# Database configuration pulling from Vercel Environment Variables
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE'),
}
print("DB DEBUG →", DB_CONFIG['host'], DB_CONFIG['user'], DB_CONFIG['password'], DB_CONFIG['database'])
if not DB_CONFIG['host'] or not DB_CONFIG['user'] or not DB_CONFIG['database']:
    # raise Exception("Database not configured in environment variables")
    pass


class Database:
    _instance = None    

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            try:
                # Only initialize pool if environment variables are present
                if DB_CONFIG['host']:
                    cls._pool = MySQLConnectionPool(**DB_CONFIG)
                    logger.info("Database connection pool created successfully")
                else:
                    logger.warning("MYSQL_HOST not set. Database features will be unavailable.")
            except Error as e:
                logger.error(f"Error creating connection pool: {e}")
                # Don't raise HTTPException here; let it fail at the call site
        return cls._instance

    def get_connection(self):
        if hasattr(self, "_pool"):
            return self._pool.get_connection()
        else:
            raise Exception("Database not initialized")
        
    def init_database(self):
        """
        In Serverless, only call this manually or check for table existence once.
        Avoid dropping tables in production.
        """
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # Simplified Table Creation (No dropping tables automatically)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS images (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    url VARCHAR(255) NOT NULL,
                    prompt TEXT,
                    user_email VARCHAR(255),
                    model_type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user_email (user_email)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    prompt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            connection.commit()
            logger.info("Database tables verified/initialized")
        except Error as e:
            logger.error(f"Error initializing database: {e}")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def store_image(self, url: str, prompt: str, user_email: Optional[str] = None, model_type: Optional[str] = None):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            cursor.execute(
                "INSERT INTO images (url, prompt, user_email, model_type) VALUES (%s, %s, %s, %s)",
                (url, prompt, user_email, model_type)
            )
            connection.commit()
            return cursor.lastrowid
        except Error as e:
            logger.error(f"Error storing image: {e}")
            raise HTTPException(status_code=500, detail="Error storing image")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_images(self, user_email: Optional[str] = None):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=True)
            if user_email:
                cursor.execute("SELECT * FROM images WHERE user_email = %s ORDER BY created_at DESC", (user_email,))
            else:
                cursor.execute("SELECT * FROM images ORDER BY created_at DESC")
            return cursor.fetchall()
        except Error as e:
            logger.error(f"Error fetching images: {e}")
            raise HTTPException(status_code=500, detail="Error fetching images")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def delete_image(self, image_id: int, user_email: Optional[str] = None):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            if user_email:
                cursor.execute("DELETE FROM images WHERE id = %s AND user_email = %s", (image_id, user_email))
            else:
                cursor.execute("DELETE FROM images WHERE id = %s", (image_id,))
            connection.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Image not found")
            return True
        except Error as e:
            logger.error(f"Error deleting image: {e}")
            raise HTTPException(status_code=500, detail="Error deleting image")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_recent_predictions(self, limit: int = 10):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM predictions ORDER BY created_at DESC LIMIT %s", (limit,))
            return cursor.fetchall()
        except Error as e:
            logger.error(f"Error fetching predictions: {e}")
            raise HTTPException(status_code=500, detail="Error fetching predictions")
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

# Create a singleton instance
db = Database()