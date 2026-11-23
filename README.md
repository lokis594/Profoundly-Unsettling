# PROFOUNDLY UNSETTLING

Prototipo V0.1 de terror psicológico en primera persona. Empiezas junto a la entrada sur del Outpatient Hall. Puedes explorar sus cuatro plantas, escapar de la Enfermera de Agujas y volver al vestíbulo por las escaleras. El alcance de esta versión es la exploración y la supervivencia libre.

## Ejecutar en local

Necesitas un navegador de escritorio con WebGL 2, teclado y ratón. Python 3 sirve los archivos estáticos. El juego usa HTML, CSS y módulos ES y arranca sin instalar dependencias ni compilar.

Desde la carpeta que contiene `index.html`, ejecuta este comando.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

En Windows puedes usar `py -3 -m http.server 8000 --bind 127.0.0.1`. Abre **http://127.0.0.1:8000/** y pulsa **PLAY**. Sirve la carpeta por HTTP para que el navegador pueda resolver los módulos ES. Para cerrar el servidor, pulsa Ctrl+C en la terminal.

La Enfermera de Agujas utiliza un modelo articulado en 3D. El sonido de sus pies y agujas sigue el desplazamiento de cada paso.

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

**OPTIONS** ajusta el volumen, la sensibilidad y la resolución. Se guardan en el navegador. La resolución interna predeterminada es 360 × 202. También puedes elegir 320 × 180, 426 × 240 o 480 × 270. La cámara se ajusta a la relación de aspecto de la ventana. **EXIT** abre la pantalla de cierre de sesión.

## Recorrido de verificación

1. Desde el vestíbulo sur encontrarás los mostradores al este y las dos farmacias al norte. El pasillo detrás de los consultorios comunica las alas oeste y este. Las escaleras del suroeste y del centro-este bajan a B1. Las de la unión oeste y del noreste suben a F2. En hospitalización hay que rodear las camillas por las salas 201 y 202. La escalera del extremo sureste de F2 lleva a F3.
2. Alterna F y sigue el indicador de la linterna. Corre hasta agotar la energía. Al caminar o detenerte se recupera. Puedes volver a correr cuando alcance el 24 %.
3. Apaga la linterna en una zona tranquila y observa **INQUIETUD**. Parte del 0 % y crece con la oscuridad, la proximidad de la enfermera y ciertas salas. Por encima del 60 % aparecen viñeta, temblor de cámara, parpadeo, latidos y un pitido que aumenta con la inquietud. Con luz y lejos del peligro, la inquietud desciende.
4. Acércate a la enfermera o alúmbrala con visión despejada. Tras la alerta comienza a perseguirte. Cada ataque a corta distancia resta 18 puntos. A cero de salud aparece **GAME OVER**. **REINICIAR** restablece las estadísticas y la posición.
5. Pulsa **PLAY** para activar el sonido. Prueba los pasos al caminar y correr, el clic de la linterna y el zumbido cerca de un fluorescente que parpadea. Al bajar al sótano cambia el timbre del ambiente. Ajusta el volumen en **OPTIONS** desde la pausa.

La salud, energía, inquietud y linterna se conservan al usar las escaleras. Cada planta inicia su propia patrulla al entrar. Esc congela tanto al jugador como a la enfermera.

## Publicar en GitHub Pages

1. Guarda el contenido del proyecto en una rama del repositorio con `index.html`, `css/`, `js/` y `assets/` en la raíz. Si trabajas con el ZIP, extrae la carpeta y sube su **contenido**. Incluye el archivo `.nojekyll`.
2. En el repositorio, abre **Settings → Pages → Build and deployment**. En **Source**, elige **Deploy from a branch**.
3. Selecciona la rama que contiene el prototipo y **/(root)**. Pulsa **Save**.
4. Cuando el despliegue termine, abre **Visit site** en esa misma pantalla. Para este repositorio, con el dominio predeterminado, la dirección esperada es `https://lokis594.github.io/Profoundly-Unsettling/`.
5. Comprueba **PLAY**, F y una escalera. Todos los módulos y activos del juego usan rutas relativas compatibles con el subdirectorio de Pages.

## Arquitectura

| Módulo | Responsabilidad |
| --- | --- |
| `js/main.js` | Entrada, ciclo de animación, estados de menú, carga, juego, pausa y muerte. Transición entre plantas con fundido. |
| `js/core/` | Motor WebGL, cámara, niebla, entrada, recursos, sesión y sonido sintetizado. Incluye el render retro y usa la copia local de Three.js r170 en `js/vendor/`. |
| `js/world/floorsData.js` | Datos de planta, habitaciones, conexiones, mobiliario, iluminación, escaleras y patrullas. Las coordenadas son pares de columna y fila. |
| `js/world/HospitalMap.js` | Construye las mallas por instancias, gestiona la cuadrícula de colisiones, la búsqueda de rutas por anchura y la visibilidad. Los recursos exclusivos de cada planta se liberan al salir. |
| `js/world/HospitalProps.js` | Mobiliario, fluorescentes y geometría de haces de luz. |
| `js/player/` | Movimiento, colisiones AABB, oscilación de cámara, estadísticas y linterna. |
| `js/entities/` | Navegación, articulaciones y animación de patrulla, alerta, persecución y ataque. El método `playDamageAnimation()` interrumpe la acción y reproduce un retroceso. |
| `js/ui/` | Fachada 3D del menú, opciones persistentes, pantalla de cierre, HUD y efectos de inquietud. |

Para ampliar una planta, edita los rectángulos de salas y pasillos de `floorsData.js`. Un rectángulo incluye ambos extremos. Un nodo de patrulla o escalera debe estar en una celda transitable. Cada sala tiene un perímetro propio. Las entradas en `edges` abren huecos o colocan ventanillas en sus límites. El mapa comprueba las dimensiones del mobiliario, los marcos y los muros al calcular rutas. Cada escalera tiene un identificador compartido con el rellano de destino.

Para añadir un enemigo, extiende `EnemyBase`, regístralo con `registerEnemy(nombre, clase)` e importa el módulo antes de llamar a `spawnEnemy(nombre, contexto)`. La sesión inyecta el mapa y el gestor de recursos.

Los eventos narrativos o efectos de inquietud pueden suscribirse a `stats.onUnrestThreshold(callback)`. El callback recibe `{ threshold: 60, active, value }` al cruzar el umbral en cualquiera de las dos direcciones. La suscripción devuelve una función para cancelarla.

## Activos incluidos

| Ruta | Formato y procedencia |
| --- | --- |
| `assets/sprites/enemy_needle_nurse.png` | Cuerpo completo, 256 × 384, PNG con canal alfa, generado con OpenAI ImageGen |
| `assets/models/enemy_needle_nurse.glb` | Malla original de Blender con 2084 triángulos y ocho materiales. Pose estática. |

La fachada y los materiales del hospital usan texturas procedurales de 64 × 64 o 128 × 128 generadas por `AssetManager.js`. El ambiente y los efectos sonoros se sintetizan en tiempo real con Web Audio.

Three.js y sus cargadores se distribuyen bajo la licencia MIT incluida en `js/vendor/three-LICENSE.txt`. Los cargadores incluidos importan la misma instancia del motor que usa el juego. Silkscreen se distribuye bajo la licencia SIL Open Font License incluida en `assets/ui/Silkscreen-LICENSE.txt`.
