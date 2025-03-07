import os
import sqlite3
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'db_check.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            log_path,
            maxBytes=1024*1024,  # 1 MB
            backupCount=3        # Keep 3 backup files
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def check_database():
    """Check the database status and log information about tables and records."""
    # Define the absolute path to the database
    DATABASE_PATH = os.path.join(BASE_DIR, 'database.db')
    
    logger.info(f"Checking database at: {DATABASE_PATH}")
    logger.info(f"Current working directory: {os.getcwd()}")
    
    # Check if database file exists
    if not os.path.exists(DATABASE_PATH):
        logger.error(f"Database file does not exist at {DATABASE_PATH}")
        return
    
    logger.info(f"Database file exists, size: {os.path.getsize(DATABASE_PATH)} bytes")
    
    try:
        # Connect to the database
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Check tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            logger.info(f"Tables in database: {[table[0] for table in tables]}")
            
            # Check laptop_metrics records
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics;")
            count = cursor.fetchone()[0]
            logger.info(f"Number of records in laptop_metrics: {count}")
            
            if count > 0:
                # Get the most recent record
                cursor.execute("SELECT * FROM laptop_metrics ORDER BY id DESC LIMIT 1;")
                latest = cursor.fetchone()
                logger.info(f"Latest laptop_metrics record: {latest}")
            
            # Check stock_metrics records
            cursor.execute("SELECT COUNT(*) FROM stock_metrics;")
            count = cursor.fetchone()[0]
            logger.info(f"Number of records in stock_metrics: {count}")
            
            if count > 0:
                # Get the most recent records for each symbol
                cursor.execute("""
                    SELECT s1.* FROM stock_metrics s1
                    JOIN (
                        SELECT symbol, MAX(id) as max_id
                        FROM stock_metrics
                        GROUP BY symbol
                    ) s2 ON s1.symbol = s2.symbol AND s1.id = s2.max_id;
                """)
                latest_stocks = cursor.fetchall()
                logger.info(f"Latest stock_metrics records: {latest_stocks}")
    
    except Exception as e:
        logger.error(f"Error checking database: {e}")

if __name__ == "__main__":
    logger.info("Starting database check")
    check_database()
    logger.info("Database check completed") 