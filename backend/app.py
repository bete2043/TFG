from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)  # Permitir Angular

# Configuración de MongoDB
app.config['MONGO_URI'] = 'mongodb://localhost:27017/app'
mongo = PyMongo(app)

# Colecciones
users = mongo.db.usuarios
ads= mongo.db.anuncios

# Ruta para registrar un usuario
@app.route('/crear_cuenta', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    member = data.get('member')
    email = data.get('email')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    
    # Validar que no haya campos vacíos
    if not all([username, member, email, password, confirm_password]):
        return jsonify({'error': 'Faltan datos'}), 400
    
    # Verificar si el usuario o el número de socio ya existen
    if users.find_one({'username': username}):
        return jsonify({'error': 'Usuario ya registrado'}), 400
    
    if users.find_one({'member': member}):
        return jsonify({'error': 'Número de socio ya registrado'}), 400
    
    # Verificar que las contraseñas coincidan
    if password != confirm_password:
        return jsonify({'error': 'Las contraseñas no coinciden'}), 400
    
    # Hashear la contraseña y guardar el usuario en la base de datos
    hashed_password = generate_password_hash(password)
    user_id = users.insert_one({
        'username': username,
        'member': member,
        'email': email,
        'password': hashed_password
    }).inserted_id

    return jsonify({'message': 'Usuario registrado exitosamente', 'user_id': str(user_id)}), 201

# Ruta para iniciar sesión
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    print("Datos recibidos:", data)
    username = data.get('username')
    password = data.get("password")
    
    user = users.find_one({'username': username})
    
    if user and check_password_hash(user['password'], password):
        return jsonify({'message': 'Inicio de sesión exitoso'})
    else:
        return jsonify({'error': 'Usuario o contraseña incorrectos'}), 401
    
# Noticias de la pagina
@app.route('/' , methods=['GET'])
def obtener_noticias():
    info = ads.find({'visible': True})
    resultado = []
    for i in info:
        resultado.append({
            "id": str(i["_id"]),
            "descripcion": i["descripcion"],
            "foto": i["foto"]
        })
    for i in info:
        print("Datos id:", i["_id"])
        print("Datos descripcion:", i["descripcion"])
        print("Datos foto:", i["foto"])

    return jsonify(resultado)


if __name__ == '__main__':
    app.run(debug=True)
