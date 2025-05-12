import math
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permitir Angular

# Configuración de MongoDB
app.config['MONGO_URI'] = 'mongodb://localhost:27017/app'
mongo = PyMongo(app)

# Colecciones
users = mongo.db.usuarios
ads = mongo.db.anuncios
fincas = mongo.db.fincas
riego = mongo.db.riego
abonado = mongo.db.abonado
fitosanitarios = mongo.db.fitosanitarios
recoleccion = mongo.db.recoleccion
poda = mongo.db.poda
plagas = mongo.db.plagas

def decode_base64_image(base64_string):
    try:
        # Quitar encabezado si existe
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Padding necesario
        missing_padding = len(base64_string) % 4
        if missing_padding:
            base64_string += '=' * (4 - missing_padding)

        # Decodificar imagen
        image_data = base64.b64decode(base64_string)
        pil_image = Image.open(BytesIO(image_data)).convert("RGB")  # Asegura compatibilidad

        return np.asarray(pil_image)  
    except Exception as e:
        print(f"Error al decodificar la imagen: {e}")
        return None


@app.route('/contar_olivos', methods=['POST'])
def contar_olivos():

    data = request.get_json()
    image_data = data['imagen']
    mask_points = data['poligono']

    img = decode_base64_image(image_data)
    if img is None:
        return jsonify({'error': 'Error al cargar la imagen'}), 400

    # Crear máscara de región seleccionada
    mask = np.zeros(img.shape[:2], dtype=np.uint8)
    points = np.array([[int(p['x']), int(p['y'])] for p in mask_points], dtype=np.int32)
    cv2.fillPoly(mask, [points], 255)

    # Aplicar la máscara al original
    masked_img = cv2.bitwise_and(img, img, mask=mask)

    # Convertir a escala de grises
    gray = cv2.cvtColor(masked_img, cv2.COLOR_BGR2GRAY)

    # Aplicar umbral Otsu para separar fondo y olivos
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Aplicar la máscara de nuevo por seguridad
    binary = cv2.bitwise_and(binary, binary, mask=mask)

    # Quitar ruido con apertura (morfología)
    kernel = np.ones((3, 3), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    # Encontrar contornos externos
    inverted = cv2.bitwise_not(cleaned)
    contours, _ = cv2.findContours(inverted, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Contar contornos con área válida
    olivo_count = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 50 < area < 3000:  # Ajustar este rango según tamaño típico de olivos
            olivo_count += 1
            cv2.drawContours(masked_img, [cnt], -1, (0, 0, 255), 1)
    # Guardar resultados
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_img_path = f'mapa_detectado_{timestamp}.jpg'
    mask_img_path = f'mascara_binaria_{timestamp}.jpg'
    cv2.imwrite(result_img_path, masked_img)
    cv2.imwrite(mask_img_path, cleaned)

    return jsonify({
        'olivos': olivo_count,
        'image_path': result_img_path,
        'mask_path': mask_img_path
    })


# Obtener todos los datos del usuario por username
@app.route('/perfil/<username>', methods=['GET'])
def obtener_perfil(username):
    user = users.find_one({'username': username}, {'password': 0})  # No enviamos la contraseña
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    user['_id'] = str(user['_id'])
    return jsonify(user)

# Modificar un campo específico del usuario
@app.route('/perfil/<username>/modificar', methods=['PUT'])
def modificar_dato_usuario(username):
    data = request.json
    campo = data.get('campo')
    nuevo_valor = data.get('valor')

    if campo not in ['username', 'member', 'email']:
        return jsonify({'error': 'Campo no permitido'}), 400

    if campo == 'username' and users.find_one({'username': nuevo_valor}):
        return jsonify({'error': 'Este nombre de usuario ya existe'}), 400
    if campo == 'member' and users.find_one({'member': nuevo_valor}):
        return jsonify({'error': 'Este número de socio ya existe'}), 400

    result = users.update_one({'username': username}, {'$set': {campo: nuevo_valor}})
    if result.modified_count > 0:
        return jsonify({'message': f'{campo} actualizado correctamente'}), 200
    else:
        return jsonify({'message': 'No se realizaron cambios'}), 200

@app.route('/perfil/<username>/cambiar-contrasena', methods=['POST'])
def cambiar_contrasena(username):
    data = request.json
    actual = data.get('actual')
    nueva = data.get('nueva')

    user = users.find_one({'username': username})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    if actual == nueva:
        return jsonify({'error': 'Utilice una contraseña distinta'}), 200

    if not check_password_hash(user['password'], actual):
        return jsonify({'error': 'Contraseña incorrecta'}), 200
    

    hashed_nueva = generate_password_hash(nueva)
    users.update_one({'username': username}, {'$set': {'password': hashed_nueva}})

    return jsonify({'ok': 'Contraseña cambiada correctamente'}), 200

@app.route('/fincas/<user>', methods=['POST'])
def guardar_finca(user):
    data = request.json
    nombre = data.get('nombre')
    superficie = data.get('superficie')
    olivos = data.get('olivos')
    coordenadas = data.get('coordenadas')

    if fincas.find_one({'nombre': nombre}):
        return jsonify({'error': 'Ya existe una finca con ese nombre'}), 400


    if not all([user, nombre, superficie, olivos, coordenadas]):
        return jsonify({'error': 'Datos incompletos'}), 400

    fincas.insert_one({
        'nombre': nombre,
        'superficie': superficie,
        'olivos': olivos,
        'coordenadas': coordenadas
    })

    users.update_one({'username': user}, {'$push': {'fincas': nombre}})
    return jsonify({'message': 'Finca guardada correctamente'}), 201

# Fincas de cada usuario
@app.route('/fincas/<user>' , methods=['GET'])
def obtener_fincas(user):
    finca = users.find_one({'username': user})
    if not finca:
        return jsonify({"error": "Usuario no encontrado " + user}), 404
    fincas_user = finca.get("fincas", [])
    
    datos_fincas = []

    for i in fincas_user:
        datos = fincas.find_one({'nombre':i})
        if datos:
            datos_fincas.append({
                "id": str(datos["_id"]),
                "nombre": datos["nombre"],
                "superficie": datos["superficie"],
                "olivos": datos["olivos"],
                "coordenadas": datos["coordenadas"]
            })

    return jsonify(datos_fincas)

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

    return jsonify(resultado)
"USUARIOS"
""" Datos del usuario """
@app.route('/usuarios/<nombre>', methods=['GET'])
def datos_usuario(nombre):
    user = users.find_one({'nombre': nombre})
    if user:
        user['_id'] = str(user['_id'])
        return jsonify(user)
    return jsonify({'error': 'Usuario no encontrado'}), 404
""" Modificar datos del usuario """

""" RIEGO """
# Guardar los datos del riego
@app.route('/riego' , methods=['POST'])
def datos_riego():
    data = request.json
    metodoRiego = data.get('metodoRiego')
    cantidad = data.get('cantidad')
    fecha = data.get('fecha')
    riegoSeleccionado = data.get('riegoSeleccionado')

    existe = riego.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = riego.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'metodo': metodoRiego,
                    'cantidad': cantidad
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = riego.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'metodo': metodoRiego,
                'cantidad': cantidad
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/riego/<nombre_finca>' , methods=['GET'])
def historial_finca_riego(nombre_finca):
    finca = riego.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])

    return jsonify(historial)
""" ABONADO """
# Guardar los datos del abonado
@app.route('/abonado' , methods=['POST'])
def datos_abonado():
    data = request.json
    metodoAbonado = data.get('metodoAbonado')
    cantidad = data.get('cantidad')
    fecha = data.get('fecha')
    riegoSeleccionado = data.get('riegoSeleccionado')
    nombreAbono = data.get('nombreAbono')

    existe = abonado.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = abonado.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'nombre': nombreAbono,
                    'metodo': metodoAbonado,
                    'cantidad': cantidad
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = abonado.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'nombre': nombreAbono,
                'metodo': metodoAbonado,
                'cantidad': cantidad
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/abonado/<nombre_finca>' , methods=['GET'])
def historial_finca_abonado(nombre_finca):
    finca = abonado.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])

    return jsonify(historial)

""" FITOSANITARIOS """
# Guardar los datos de los fitosanitarios
@app.route('/fitosanitarios' , methods=['POST'])
def datos_fitosanitarios():
    data = request.json
    tipofitosanitario = data.get('tipofitosanitario')
    cantidad = data.get('cantidadFitosanitario')
    fecha = data.get('fechaSeleccionadaFitosaniario')
    riegoSeleccionado = data.get('riegoSeleccionado')
    nombreFitosanitario = data.get('nombreFitosanitario')

    existe = fitosanitarios.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = fitosanitarios.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'nombre': nombreFitosanitario,
                    'metodo': tipofitosanitario,
                    'cantidad': cantidad
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = fitosanitarios.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'nombre': nombreFitosanitario,
                'metodo': tipofitosanitario,
                'cantidad': cantidad
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/fitosanitarios/<nombre_finca>' , methods=['GET'])
def historial_finca_fitosanitarios(nombre_finca):
    finca = fitosanitarios.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])
    
    return jsonify(historial)


""" RECOLECCION """
# Guardar los datos de la recoleccion
@app.route('/recoleccion' , methods=['POST'])
def datos_recoleccion():
    data = request.json
    tipoaceituna = data.get('tipoaceituna')
    cantidad = data.get('cantidad')
    fecha = data.get('fecha')
    riegoSeleccionado = data.get('riegoSeleccionado')
    olivas = data.get('olivas')

    existe = recoleccion.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = recoleccion.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'olivas': olivas,
                    'metodo': tipoaceituna,
                    'cantidad': cantidad
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = recoleccion.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'olivas': olivas,
                'metodo': tipoaceituna,
                'cantidad': cantidad
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/recoleccion/<nombre_finca>' , methods=['GET'])
def historial_finca_recoleccion(nombre_finca):
    finca = recoleccion.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])

    """ PODA """
# Guardar los datos de la poda
@app.route('/poda' , methods=['POST'])
def datos_poda():
    data = request.json
    tipopoda = data.get('tipopoda')
    fecha = data.get('fecha')
    riegoSeleccionado = data.get('riegoSeleccionado')
    olivas = data.get('olivas')

    existe = poda.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = poda.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'olivas': olivas,
                    'metodo': tipopoda,
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = poda.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'olivas': olivas,
                'metodo': tipopoda,
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/poda/<nombre_finca>' , methods=['GET'])
def historial_finca_poda(nombre_finca):
    finca = poda.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])

    """ PLAGAS """
# Guardar los datos de las plagas
@app.route('/plagas' , methods=['POST'])
def datos_plagas():
    data = request.json
    tipoplaga = data.get('tipoplaga')
    gradoafectacion = data.get('gradoafectacion')
    tratamiento = data.get('tratamiento')
    fecha = data.get('fecha')
    riegoSeleccionado = data.get('riegoSeleccionado')
    olivas = data.get('olivas')

    existe = plagas.find_one({'nombre': riegoSeleccionado})
    if existe:
        resultado = plagas.update_one(
            {'nombre': riegoSeleccionado},  
            {'$push': {                      
                'historial': {
                    'fecha': fecha,
                    'olivas': olivas,
                    'metodo': tipoplaga,
                    'afectacion': gradoafectacion,
                    'tratamiento': tratamiento
                }
            }}
        )

        if resultado.modified_count > 0:
            return jsonify({'message': 'Datos añadidos correctamente'}), 200
        else:
            return jsonify({'message': 'No se realizaron modificaciones'}), 400
    else:
        resultado = plagas.insert_one({
            'nombre': riegoSeleccionado,
            'historial': [{
                'fecha': fecha,
                'olivas': olivas,
                'metodo': tipoplaga,
                'afectacion': gradoafectacion,
                'tratamiento': tratamiento
            }]
        })
        if resultado.inserted_id:
            return jsonify({'message': 'Nuevo riego creado correctamente'}), 201
        else:
            return jsonify({'message': 'Error al insertar datos'}), 500

#Obtener el historial
@app.route('/plagas/<nombre_finca>' , methods=['GET'])
def historial_finca_plagas(nombre_finca):
    finca = plagas.find_one({"nombre": nombre_finca})

    if not finca:
        return jsonify({"error": "Finca no encontrada"}), 404

    historial = finca.get("historial", [])
    return jsonify(historial)
if __name__ == '__main__':
    app.run(debug=True)