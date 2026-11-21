# PROFOUNDLY UNSETTLING

Prototipo V0.1 de terror psicológico en primera persona. Empiezas en la recepción del hospital. Puedes explorar sus cuatro plantas, escapar de la Enfermera de Agujas y volver a la recepción por las mismas escaleras. El alcance de esta versión es la exploración y la supervivencia libre.

## Ejecutar en local

Necesitas un navegador de escritorio con WebGL 2, teclado y ratón. Python 3 sirve los archivos estáticos. El juego usa HTML, CSS y módulos ES y arranca sin instalar dependencias ni compilar.

Desde la carpeta que contiene `index.html`, ejecuta este comando.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

En Windows puedes usar `py -3 -m http.server 8000 --bind 127.0.0.1`. Abre **http://127.0.0.1:8000/** y pulsa **PLAY**. Sirve la carpeta por HTTP para que el navegador pueda resolver los módulos ES. Para cerrar el servidor, pulsa Ctrl+C en la terminal.

Para ver la versión de la enfermera con malla tridimensional, abre **http://127.0.0.1:8000/?enemy=3d**. La vista predeterminada usa el sprite frontal orientado a la cámara. Las dos representaciones comparten IA, navegación y daño.

## Controles

| Acción | Entrada |
| --- | --- |
| Caminar | W, A, S, D |
| Mirar | Ratón con el puntero capturado. Las flechas también giran la cámara. Si el navegador restringe Pointer Lock, se puede arrastrar sobre la escena. |
| Correr | Mantener Shift mientras te mueves |
| Linterna | F |
| Subir o bajar | E cuando aparezca el aviso frente a una escalera |
| Pausa | Esc. Perder el foco también pausa la simulación. |
| Navegar por el menú | ↑ / ↓ y Enter, Tab o ratón |

**OPTIONS** ajusta el volumen, la sensibilidad y la resolución. Se guardan en el navegador. Las tres resoluciones de referencia son 320 × 180, 426 × 240 y 480 × 270. En otras relaciones de aspecto se mantiene la altura interna y se ajusta el ancho para conservar las proporciones. **EXIT** abre la pantalla de cierre de sesión.

## Recorrido de verificación

1. En recepción empiezas mirando hacia el pasillo central. La escalera que queda a tu espalda lleva a B1. La que hay al otro extremo del pasillo lleva a P2. Sigue hasta P3 por la salida opuesta de P2. Recorre el camino inverso. El distintivo de planta y los rótulos de sala cambian durante el recorrido.
2. Alterna F y sigue el indicador de la linterna. Corre hasta agotar la energía. Al caminar o detenerte se recupera. Puedes volver a correr cuando alcance el 24 %.
3. Apaga la linterna en una zona tranquila y observa **INQUIETUD**. Parte del 0 % y crece con la oscuridad, la proximidad de la enfermera y ciertas salas. Por encima del 60 % aparecen viñeta, temblor de cámara y parpadeo. Con luz y lejos del peligro, la inquietud desciende.
4. Acércate a la enfermera o alúmbrala con visión despejada. Tras la alerta comienza a perseguirte. Cada ataque a corta distancia resta 18 puntos. A cero de salud aparece **GAME OVER**. **REINICIAR** restablece las estadísticas y la posición.
5. Para probar los respaldos sin modificar el repositorio, bloquea las peticiones que contengan `/assets/` en las herramientas de desarrollo del navegador, desactiva la caché y recarga. El menú dibuja la fachada y la neblina en Canvas. El hospital y la enfermera usan texturas procedurales. Si falta el GLB, el modo 3D también recurre al sprite.

La salud, energía, inquietud y linterna se conservan al usar las escaleras. Cada planta inicia su propia patrulla al entrar. Esc congela tanto al jugador como a la enfermera.

## Publicar en GitHub Pages

1. Guarda el contenido del proyecto en una rama del repositorio con `index.html`, `css/`, `js/` y `assets/` en la raíz. Si trabajas con el ZIP, extrae la carpeta y sube su **contenido**. Incluye el archivo `.nojekyll`.
2. En el repositorio, abre **Settings → Pages → Build and deployment**. En **Source**, elige **Deploy from a branch**.
3. Selecciona la rama que contiene el prototipo y **/(root)**. Pulsa **Save**.
4. Cuando el despliegue termine, abre **Visit site** en esa misma pantalla. Para este repositorio, con el dominio predeterminado, la dirección esperada es `https://lokis594.github.io/Profoundly-Unsettling/`. Añade `?enemy=3d` a la URL para cargar la malla.
5. Comprueba **PLAY**, F y una escalera. Todos los módulos y activos del juego usan rutas relativas compatibles con el subdirectorio de Pages.

## Arquitectura

| Módulo | Responsabilidad |
| --- | --- |
| `js/main.js` | Entrada, ciclo de animación, estados de menú, carga, juego, pausa y muerte. Transición entre plantas con fundido. |
| `js/core/` | Motor WebGL, cámara, niebla, entrada, recursos, sesión y sonido sintetizado. El importmap fija Three.js r170. Si el CDN no responde, se carga la copia incluida en `js/vendor/`. |
| `js/world/floorsData.js` | Datos de planta, habitaciones, conexiones, mobiliario, iluminación, escaleras y patrullas. Las coordenadas son pares de columna y fila. |
| `js/world/HospitalMap.js` | Construye las mallas por instancias, gestiona la cuadrícula de colisiones, la búsqueda de rutas por anchura y la visibilidad. Los recursos exclusivos de cada planta se liberan al salir. |
| `js/player/` | Movimiento, colisiones AABB, oscilación de cámara, estadísticas y linterna. |
| `js/entities/` | Clase base, registro de tipos y máquina de estados PATROL → ALERT → CHASE → ATTACK con pérdida de contacto y vuelta a patrulla. |
| `js/ui/` | Menú, opciones persistentes, pantalla de cierre, HUD y efectos de inquietud. |

Para ampliar una planta, edita los rectángulos de salas y pasillos de `floorsData.js`. Un rectángulo incluye ambos extremos. Un nodo de patrulla o escalera debe estar en una celda transitable. Los obstáculos de mobiliario ocupan una celda. Las escaleras llevan un índice de destino y necesitan una entrada recíproca en la planta vecina.

Para añadir un enemigo, extiende `EnemyBase`, regístralo con `registerEnemy(nombre, clase)` e importa el módulo antes de llamar a `spawnEnemy(nombre, contexto)`. La sesión inyecta el mapa y el gestor de recursos.

Los eventos narrativos o efectos de inquietud pueden suscribirse a `stats.onUnrestThreshold(callback)`. El callback recibe `{ threshold: 60, active, value }` al cruzar el umbral en cualquiera de las dos direcciones. La suscripción devuelve una función para cancelarla.

## Activos incluidos

| Ruta | Formato y procedencia |
| --- | --- |
| `assets/ui/menu_hospital_bg.png` | Hospital nocturno, 384 × 216, generado con OpenAI ImageGen y reducido con vecino más cercano |
| `assets/textures/wall_tiles.png` | Azulejo agrietado, 512 × 512, material procedural periódico |
| `assets/textures/floor_linoleum.png` | Linóleo, 512 × 512, material procedural periódico |
| `assets/textures/ceiling_grime.png` | Humedad y óxido, 512 × 512, material procedural periódico |
| `assets/textures/door_metal.png` | Acero con mirilla, 512 × 512, textura frontal procedural |
| `assets/sprites/enemy_needle_nurse.png` | Cuerpo completo, 256 × 384, PNG con canal alfa, generado con OpenAI ImageGen |
| `assets/models/enemy_needle_nurse.glb` | Malla original de Blender con 2084 triángulos y ocho materiales. Pose estática. |

Higgsfield rechazó el lote de seis imágenes por el requisito de plan Basic o superior. El servicio procesó cero trabajos y no devolvió URLs para descargar con `curl -L`. Los archivos de la tabla son los activos alternativos guardados en las rutas solicitadas. El intento posterior de regenerar el fondo en Higgsfield devolvió el mismo requisito de plan. El menú amplía el PNG de 384 × 216 sin suavizado y muestra los rótulos en HTML y CSS.

Three.js y sus cargadores se distribuyen bajo la licencia MIT incluida en `js/vendor/three-LICENSE.txt`. Los cargadores incluidos importan la misma instancia del motor que usa el juego. Silkscreen se distribuye bajo la licencia SIL Open Font License incluida en `assets/ui/Silkscreen-LICENSE.txt`.
