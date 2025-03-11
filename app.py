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
                    computer_id TEXT,
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
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            logger.info("Database initialized successfully")
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
                    INSERT INTO laptop_metrics (computer_id, cpu_usage, memory_usage, last_updated)
                    VALUES (?, ?, ?, ?)
                ''', (data.get('computer_id', 'unknown'), data.get('cpu_usage'), data.get('memory_usage'), datetime.now()))
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
            cur.execute('SELECT computer_id, cpu_usage, memory_usage, last_updated FROM laptop_metrics ORDER BY id DESC LIMIT 1')
            row = cur.fetchone()
            if row:
                metric = {
                    'computer_id': row[0],
                    'cpu_usage': row[1],
                    'memory_usage': row[2],
                    'last_updated': row[3]
                }
                logger.info(f"Retrieved latest metrics: {metric}")
    except Exception as e:
        logger.error(f"Error retrieving metrics: {e}")
    
    return jsonify(metric if metric else {})

@app.route('/stock_metrics', methods=['POST'])
def receive_stock_metrics():
    if request.is_json:
        data = request.get_json()
        logger.info(f"Received stock metrics data: {data}")
        try:
            with sqlite3.connect(DATABASE_PATH) as conn:
                cur = conn.cursor()
                records_inserted = 0
                
                # Check if we have data for multiple stocks
                if isinstance(data, list):
                    for stock in data:
                        cur.execute('''
                            INSERT INTO stock_metrics (symbol, price, change_percent, timestamp)
                            VALUES (?, ?, ?, ?)
                        ''', (
                            stock.get('symbol'), 
                            stock.get('price'), 
                            stock.get('change_percent'), 
                            stock.get('timestamp')
                        ))
                        records_inserted += 1
                else:
                    # Single stock data
                    cur.execute('''
                        INSERT INTO stock_metrics (symbol, price, change_percent, timestamp)
                        VALUES (?, ?, ?, ?)
                    ''', (
                        data.get('symbol'), 
                        data.get('price'), 
                        data.get('change_percent'), 
                        data.get('timestamp')
                    ))
                    records_inserted += 1
                
                conn.commit()
            logger.info(f"Successfully inserted {records_inserted} stock metrics records into database")
            return jsonify({"status": "success", "records_inserted": records_inserted}), 201
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
                SELECT s1.symbol, s1.price, s1.change_percent, s1.timestamp
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
                    'timestamp': row[3]
                })
            
            if stocks:
                logger.info(f"Retrieved {len(stocks)} stock records")
            else:
                logger.warning("No stock data found in database")
    except Exception as e:
        logger.error(f"Error retrieving stock data: {e}")
    
    return jsonify(stocks)

@app.route('/api/historical/system_metrics', methods=['GET'])
def api_historical_system_metrics():
    """Endpoint to get historical system metrics data for charts"""
    metrics = []
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row  # This enables column access by name
            cur = conn.cursor()
            
            # Get data from the last 24 hours (or adjust as needed)
            cur.execute('''
                SELECT cpu_usage, memory_usage, last_updated 
                FROM laptop_metrics 
                ORDER BY last_updated ASC
                LIMIT 100
            ''')
            
            rows = cur.fetchall()
            for row in rows:
                metrics.append({
                    'cpu_usage': row['cpu_usage'],
                    'memory_usage': row['memory_usage'],
                    'timestamp': row['last_updated']
                })
            
            if metrics:
                logger.info(f"Retrieved {len(metrics)} historical system metrics records")
            else:
                logger.warning("No historical system metrics found in database")
    except Exception as e:
        logger.error(f"Error retrieving historical system metrics: {e}")
    
    return jsonify(metrics)

@app.route('/api/historical/stock_metrics', methods=['GET'])
def api_historical_stock_metrics():
    """Endpoint to get historical stock metrics data for charts"""
    symbol = request.args.get('symbol', None)
    metrics = []
    
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            
            if symbol:
                # Get historical data for a specific stock symbol (last 30 records)
                cur.execute('''
                    SELECT symbol, price, change_percent, timestamp 
                    FROM stock_metrics 
                    WHERE symbol = ?
                    ORDER BY timestamp DESC
                    LIMIT 30
                ''', (symbol,))
            else:
                # Get historical data for all symbols (last 30 records per symbol)
                cur.execute('''
                    WITH ranked_data AS (
                        SELECT 
                            symbol, 
                            price, 
                            change_percent, 
                            timestamp,
                            ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
                        FROM stock_metrics
                    )
                    SELECT symbol, price, change_percent, timestamp
                    FROM ranked_data
                    WHERE rn <= 30
                    ORDER BY symbol, timestamp ASC
                ''')
            
            rows = cur.fetchall()
            for row in rows:
                metrics.append({
                    'symbol': row['symbol'],
                    'price': row['price'],
                    'change_percent': row['change_percent'],
                    'timestamp': row['timestamp']
                })
            
            if metrics:
                logger.info(f"Retrieved {len(metrics)} historical stock metrics records")
            else:
                logger.warning("No historical stock metrics found in database")
    except Exception as e:
        logger.error(f"Error retrieving historical stock metrics: {e}")
    
    return jsonify(metrics)

@app.route('/api/system_metrics/table', methods=['GET'])
def api_system_metrics_table():
    """Endpoint to get system metrics data for the DataTable"""
    computer_id = request.args.get('computer_id', None)
    limit = request.args.get('limit', 100, type=int)
    metrics = []
    
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            
            if computer_id:
                # Get data for a specific computer
                cur.execute('''
                    SELECT id, computer_id, cpu_usage, memory_usage, last_updated 
                    FROM laptop_metrics 
                    WHERE computer_id = ?
                    ORDER BY last_updated DESC
                    LIMIT ?
                ''', (computer_id, limit))
            else:
                # Get data for all computers
                cur.execute('''
                    SELECT id, computer_id, cpu_usage, memory_usage, last_updated 
                    FROM laptop_metrics 
                    ORDER BY last_updated DESC
                    LIMIT ?
                ''', (limit,))
            
            rows = cur.fetchall()
            for row in rows:
                metrics.append({
                    'id': row['id'],
                    'computer_id': row['computer_id'],
                    'cpu_usage': row['cpu_usage'],
                    'memory_usage': row['memory_usage'],
                    'timestamp': row['last_updated']
                })
            
            if metrics:
                logger.info(f"Retrieved {len(metrics)} system metrics records for table")
            else:
                logger.warning("No system metrics found in database for table")
    except Exception as e:
        logger.error(f"Error retrieving system metrics for table: {e}")
    
    return jsonify(metrics)

@app.route('/')
def index():
    return redirect(url_for('display_metrics'))

@app.route('/metrics', methods=['GET'])
def display_metrics():
    return render_template('metrics.html')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
