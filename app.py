import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify, render_template, redirect, url_for
from datetime import datetime
import sqlite3

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'app.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            log_path,
            maxBytes=1024*1024,  # 1 MB
            backupCount=5        # Keep 5 backup files
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Define the database path
DATABASE_PATH = os.path.join(BASE_DIR, 'database.db')
logger.info(f"Database path: {DATABASE_PATH}")

# Function to create database and table
def init_db():
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            # Create laptop metrics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS laptop_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cpu_temp INTEGER,
                    cpu_usage REAL,
                    memory_usage REAL,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create stock metrics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS stock_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    price REAL,
                    change_percent REAL,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        logger.info("Database Initialized successfully.")
        print("Database Initialized.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

# Initialize the database
init_db()

@app.route('/metrics', methods=['POST'])
def receive_metrics():
    if request.is_json:
        data = request.get_json()
        client_ip = request.remote_addr
        logger.info(f"Received metrics data from IP {client_ip}: {data}")
        try:
            with sqlite3.connect(DATABASE_PATH) as conn:
                cur = conn.cursor()
                cur.execute('''
                    INSERT INTO laptop_metrics (cpu_temp, cpu_usage, memory_usage, last_updated)
                    VALUES (?, ?, ?, ?)
                ''', (data.get('cpu_temp'), data.get('cpu_usage'), data.get('memory_usage'), datetime.now()))
                conn.commit()
            logger.info("Successfully inserted metrics data into database")
            return jsonify({"message": "Metrics received"}), 200
        except Exception as e:
            logger.error(f"Error inserting metrics data: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500
    logger.warning("Received non-JSON request")
    return jsonify({"error": "Request must be JSON"}), 400

@app.route('/api/metrics', methods=['GET'])
def api_metrics():
    metric = None
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cur = conn.cursor()
            cur.execute('SELECT cpu_temp, cpu_usage, memory_usage, last_updated FROM laptop_metrics ORDER BY id DESC LIMIT 1')
            row = cur.fetchone()
            if row:
                metric = {
                    'cpu_temp': row[0],
                    'cpu_usage': row[1],
                    'memory_usage': row[2],
                    'last_updated': row[3]
                }
                logger.info(f"Retrieved latest metrics: {metric}")
            else:
                logger.warning("No metrics data found in database")
    except Exception as e:
        logger.error(f"Error retrieving metrics data: {e}")
    return jsonify(metric)

@app.route('/stock_metrics', methods=['POST'])
def receive_stock_metrics():
    if request.is_json:
        data = request.get_json()
        logger.info(f"Received stock metrics data: {data}")
        try:
            with sqlite3.connect(DATABASE_PATH) as conn:
                cur = conn.cursor()
                
                # Check if we have data for multiple stocks
                if isinstance(data, list):
                    for stock in data:
                        cur.execute('''
                            INSERT INTO stock_metrics (symbol, price, change_percent, last_updated)
                            VALUES (?, ?, ?, ?)
                        ''', (stock.get('symbol'), stock.get('price'), stock.get('change_percent'), datetime.now()))
                else:
                    # Single stock data
                    cur.execute('''
                        INSERT INTO stock_metrics (symbol, price, change_percent, last_updated)
                        VALUES (?, ?, ?, ?)
                    ''', (data.get('symbol'), data.get('price'), data.get('change_percent'), datetime.now()))
                
                conn.commit()
            logger.info("Successfully inserted stock metrics data into database")
            return jsonify({"message": "Stock metrics received"}), 200
        except Exception as e:
            logger.error(f"Error inserting stock metrics data: {e}")
            return jsonify({"error": f"Database error: {str(e)}"}), 500
    logger.warning("Received non-JSON request for stock metrics")
    return jsonify({"error": "Request must be JSON"}), 400

@app.route('/api/stock_metrics', methods=['GET'])
def api_stock_metrics():
    stocks = []
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cur = conn.cursor()
            # Get the latest data for each stock symbol
            cur.execute('''
                SELECT s1.symbol, s1.price, s1.change_percent, s1.last_updated
                FROM stock_metrics s1
                JOIN (
                    SELECT symbol, MAX(id) as max_id
                    FROM stock_metrics
                    GROUP BY symbol
                ) s2 ON s1.symbol = s2.symbol AND s1.id = s2.max_id
            ''')
            rows = cur.fetchall()
            
            for row in rows:
                stocks.append({
                    'symbol': row[0],
                    'price': row[1],
                    'change_percent': row[2],
                    'last_updated': row[3]
                })
            
            if stocks:
                logger.info(f"Retrieved {len(stocks)} stock records")
            else:
                logger.warning("No stock data found in database")
    except Exception as e:
        logger.error(f"Error retrieving stock data: {e}")
    
    return jsonify(stocks)

@app.route('/')
def index():
    return redirect(url_for('display_metrics'))

@app.route('/metrics', methods=['GET'])
def display_metrics():
    return render_template('metrics.html')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
