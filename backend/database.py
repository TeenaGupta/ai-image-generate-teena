import os
import logging
from typing import Optional, Dict, List
from mysql.connector import Error
import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'ai_image'),
    'pool_name': 'imagix_pool',
    'pool_size': 5,
    'pool_reset_session': True,
    'autocommit': True,
    'use_pure': True
}

class Database:
    _instance = None
    _pool = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            try:
                cls._pool = MySQLConnectionPool(**DB_CONFIG)
                logger.info("Database connection pool created successfully")
            except Error as e:
                logger.error(f"Error creating connection pool: {e}")
                raise HTTPException(status_code=500, detail="Database connection error")
        return cls._instance

    def get_connection(self):
        try:
            connection = self._pool.get_connection()
            logger.info("Successfully obtained database connection from pool")
            return connection
        except Error as e:
            logger.error(f"Error getting connection from pool: {e}")
            # Log more detailed information about the database configuration
            logger.error(f"Database config: host={DB_CONFIG['host']}, user={DB_CONFIG['user']}, database={DB_CONFIG['database']}")
            raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

    def init_database(self):
        """Initialize database tables if they don't exist"""
        connection = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # Check if model_type column exists
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.columns 
                WHERE table_name = 'images'
                AND column_name = 'model_type'
            """)
            model_type_exists = cursor.fetchone()[0] > 0

            if not model_type_exists:
                # Drop existing images table if model_type column doesn't exist
                cursor.execute("DROP TABLE IF EXISTS images")
            
            # Create images table with model_type
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
            
            # Create predictions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    prompt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            connection.commit()
            logger.info("Database tables initialized successfully")
        except Error as e:
            logger.error(f"Error initializing database: {e}")
            raise HTTPException(status_code=500, detail="Database initialization error")
        finally:
            if connection:
                cursor.close()
                connection.close()

    def store_image(self, url: str, prompt: str, user_email: Optional[str], model_type: str) -> None:
        """Store image details in database"""
        connection = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            cursor.execute(
                "INSERT INTO images (url, prompt, user_email, model_type) VALUES (%s, %s, %s, %s)",
                (url, prompt, user_email, model_type)
            )
            
            cursor.execute(
                "INSERT INTO predictions (prompt) VALUES (%s)",
                (prompt,)
            )
            
            connection.commit()
            logger.info("Successfully stored image and prediction in database")
        except Error as e:
            logger.error(f"Database error while storing image: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        finally:
            if connection:
                cursor.close()
                connection.close()

    def get_images(self, user_email: Optional[str] = None) -> List[Dict]:
        """Get images from database"""
        connection = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=True)
            
            if user_email:
                cursor.execute(
                    "SELECT id, url, prompt, created_at, user_email, model_type FROM images WHERE user_email = %s ORDER BY created_at DESC",
                    (user_email,)
                )
            else:
                cursor.execute(
                    "SELECT id, url, prompt, created_at, model_type FROM images ORDER BY created_at DESC"
                )
                
            results = cursor.fetchall()
            logger.debug(f"Retrieved {len(results)} images with details from database")
            return results
        except Error as e:
            logger.error(f"Database error while fetching images: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        finally:
            if connection:
                cursor.close()
                connection.close()

    def delete_image(self, image_id: int, user_email: Optional[str] = None) -> None:
        """Delete image from database"""
        connection = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            if user_email:
                cursor.execute(
                    "DELETE FROM images WHERE id = %s AND user_email = %s",
                    (image_id, user_email)
                )
            else:
                cursor.execute(
                    "DELETE FROM images WHERE id = %s AND user_email IS NULL",
                    (image_id,)
                )
            
            connection.commit()
        except Error as e:
            logger.error(f"Database error while deleting image: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        finally:
            if connection:
                cursor.close()
                connection.close()

    def get_recent_predictions(self, limit: int = 5) -> List[str]:
        """Get recent predictions from database"""
        connection = None
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT prompt FROM predictions ORDER BY created_at DESC LIMIT %s",
                (limit,)
            )
            results = cursor.fetchall()
            return [row['prompt'] for row in results]
        except Error as e:
            logger.error(f"Database error while fetching predictions: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        finally:
            if connection:
                cursor.close()
                connection.close()

# Create a singleton instance
db = Database()
