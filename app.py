from flask import Flask, request, jsonify, render_template, redirect, url_for
from datetime import datetime
import sqlite3

app = Flask(__name__)

# Function to create database and table
import sqlite3

def init_db():
    with sqlite3.connect('database.db') as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS laptop_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cpu_temp INTEGER,
                cpu_usage REAL,
                memory_usage REAL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    print("Database Initialized.")

# Initialize the database
init_db()

@app.route('/metrics', methods=['POST'])
def receive_metrics():
    if request.is_json:
        data = request.get_json()
        with sqlite3.connect('database.db') as conn:
            cur = conn.cursor()
            cur.execute('''
                INSERT INTO laptop_metrics (cpu_temp, cpu_usage, memory_usage, last_updated)
                VALUES (?, ?, ?, ?)
            ''', (data.get('cpu_temp'), data.get('cpu_usage'), data.get('memory_usage'), datetime.now()))
            conn.commit()
        return jsonify({"message": "Metrics received"}), 200
    return jsonify({"error": "Request must be JSON"}), 400

@app.route('/api/metrics', methods=['GET'])
def api_metrics():
    metric = None
    with sqlite3.connect('database.db') as conn:
        cur = conn.cursor()
        cur.execute('SELECT cpu_temp, last_updated FROM laptop_metrics ORDER BY id DESC LIMIT 1')
        row = cur.fetchone()
        if row:
            metric = {'cpu_temp': row[0], 'last_updated': row[1]}
    return jsonify(metric)

@app.route('/')
def index():
    return redirect(url_for('display_metrics'))

@app.route('/metrics', methods=['GET'])
def display_metrics():
    return render_template('metrics.html')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
