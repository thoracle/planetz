from flask import Flask, jsonify, request
from verse import generate_star_system

app = Flask(__name__)

@app.route('/api/generate_star_system')
def api_generate_star_system():
    seed = request.args.get('seed')
    if seed:
        try:
            seed = int(seed)
        except ValueError:
            return jsonify({'error': 'Invalid seed value'}), 400
    
    star_system = generate_star_system(seed)
    return jsonify(star_system)

if __name__ == '__main__':
    app.run(debug=True) 