from ultralytics import YOLO
from PIL import Image
import requests
from io import BytesIO

# Coordenadas de prueba
image_url = 'https://maps.googleapis.com/maps/api/staticmap?center=37.9838,23.7275&zoom=18&size=640x640&maptype=satellite&key=AIzaSyCCeQhaAhcWvW8oFMwCpT0RcqxKrQ72V3s'

# Cargar imagen
response = requests.get(image_url)
img = Image.open(BytesIO(response.content))

# Cargar modelo YOLOv8 preentrenado
model = YOLO('yolov8n.pt')  # Modelo general

# Realizar la predicción
results = model.predict(img)

# Mostrar resultados
results[0].show()

# Extraer las clases detectadas
detections = results[0].boxes.cls.tolist()

# Contar árboles si están en las clases detectadas (clase 0 = person, 2 = car, etc.)
# Como no hay una clase 'tree' exacta, simplemente muestra todas las clases detectadas
print("Clases detectadas:", detections)

#opencv
