/* eslint-disable */

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Estado BLE
let device, characteristic;
let speedLevel = 5; // Nivel inicial: 5
const MAX_SPEED = 9;
const MIN_SPEED = 0;

// Estado de conexión global
let deviceConnected = false;

// Bandera de bloqueo de escritura (para evitar errores GATT)
let writeInProgress = false;

// Objeto para rastrear qué teclas de movimiento están actualmente presionadas
// (W, A, S, D) => true/false
let keyHeld = {};

// Cola/estado para garantizar que comandos críticos (ej. 'X') no se pierdan
// si hay una escritura GATT en curso. pendingCommand almacenará 1 comando
// que se enviará tan pronto termine la escritura en curso.
let pendingCommand = null;

// Indicador de que actualmente hay una acción de movimiento activa en el
// cliente (se puso en true al enviar W/A/S/D y se pone a false al enviar 'X').
// Esto evita enviar 'X' si nunca hubo movimiento.
let movementActive = false;

// Mapeo de teclas a comandos (MAYÚSCULAS)
const KEY_MAP = {
  w: 'W', // Adelante
  s: 'S', // Atrás
  a: 'A', // Izquierda
  d: 'D', // Derecha
  q: 'Q', // Abrir Pinza
  e: 'E', // Cerrar Pinza
};

// Elementos UI
const statusDiv = document.getElementById('connection-status');
const speedDiv = document.getElementById('speed-indicator');
const connectBtn = document.getElementById('connect-btn');
const panel = document.getElementById('control-panel');
const auxControls = document.getElementById('aux-controls');

// Función para actualizar la interfaz después de conectar
function updateUI(isConnected) {
  deviceConnected = isConnected;

  if (isConnected) {
    statusDiv.textContent = 'Estado: Conectado ✔️';
    statusDiv.style.backgroundColor = '#047857';
    panel.classList.remove('opacity-30', 'pointer-events-none');
    auxControls.classList.remove('opacity-30', 'pointer-events-none');
    connectBtn.textContent = 'Desconectar';
    connectBtn.onclick = disconnectBle;
    document.body.focus();
  } else {
    statusDiv.textContent = 'Estado: Desconectado ❌';
    statusDiv.style.backgroundColor = '#991B1B';
    panel.classList.add('opacity-30', 'pointer-events-none');
    auxControls.classList.add('opacity-30', 'pointer-events-none');
    connectBtn.textContent = 'Conectar a ADCA07';
    connectBtn.onclick = connectBle;
  }
}

// --- Lógica de Conexión BLE ---
async function connectBle() {
  if (!navigator.bluetooth) {
    console.error('Tu navegador no soporta Web Bluetooth. Asegúrate de usar Chrome.');
    return;
  }

  try {
    // 1. Pedir el dispositivo BLE (filtrando por nombre)
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'ADCA07' }],
      optionalServices: [SERVICE_UUID],
    });

    device.addEventListener('gattserverdisconnected', onDisconnected);

    // 2. Conectar al Servidor GATT
    statusDiv.textContent = 'Estado: Conectando...';
    const server = await device.gatt.connect();

    // 3. Obtener el Servicio
    const service = await server.getPrimaryService(SERVICE_UUID);

    // 4. Obtener la Característica de Escritura
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    updateUI(true);
    // Enviar la velocidad inicial después de conectar
    sendCommand(speedLevel.toString());
  } catch (error) {
    console.error('Error de conexión BLE:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    updateUI(false);
  }
}

function onDisconnected(event) {
  const device = event.target;
  console.log(`Dispositivo ${device.name} desconectado.`);
  updateUI(false);
  // Aseguramos que el estado de las teclas se reinicie
  keyHeld = {};
}

function disconnectBle() {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
  updateUI(false);
}

// --- Lógica de Comando y Escritura (Mismo patrón de retardo) ---
async function sendCommand(char) {
  if (!characteristic) {
    console.error('Característica BLE no disponible. ¿Estás conectado?');
    return;
  }

  // Si ya hay una escritura en progreso, encolamos el comando más reciente
  // (sobrescribiendo cualquier pendiente) para que se envíe justo después.
  if (writeInProgress) {
    // Si el comando es igual al pendiente, no hacemos nada extra.
    if (pendingCommand !== char) {
      pendingCommand = char;
      console.log(`Escritura en progreso. Encolado: ${char}`);
    }
    return;
  }

  writeInProgress = true;

  try {
    const value = new TextEncoder().encode(char);
    await characteristic.writeValue(value);
    console.log(`Comando enviado: ${char}`);
    document.getElementById('status-message').textContent = `Último comando: ${char}`;
  } catch (error) {
    console.error('Error al escribir en GATT (capturado):', error);
  } finally {
    // Liberar el bloqueo SIEMPRE, incluso si la escritura falla
    writeInProgress = false;

    // Si hay un comando pendiente, envíalo inmediatamente después de liberar el bloqueo.
    if (pendingCommand) {
      const next = pendingCommand;
      pendingCommand = null;
      // Llamada asíncrona: no await aquí para evitar bloquear el hilo de finalización.
      // La propia función sendCommand gestionará la cola si es necesario.
      sendCommand(next);
    }
  }
}

// --- Lógica de Control de Velocidad ---
function changeSpeed(delta) {
  if (!deviceConnected) return;

  let newSpeed = speedLevel + delta;

  if (newSpeed > MAX_SPEED) {
    newSpeed = MAX_SPEED;
  } else if (newSpeed < MIN_SPEED) {
    newSpeed = MIN_SPEED;
  }

  if (newSpeed !== speedLevel) {
    speedLevel = newSpeed;
    speedDiv.textContent = `Velocidad: ${speedLevel} (${
      speedLevel === MAX_SPEED ? 'MÁX' : speedLevel === MIN_SPEED ? 'MÍN' : 'Medio'
    })`;
    // Envía el nuevo nivel de velocidad como carácter ('0' a '9')
    sendCommand(speedLevel.toString());
  }
}

// Función auxiliar para verificar si alguna tecla de movimiento está presionada
function isAnyMovementKeyPressed() {
  return keyHeld.w || keyHeld.a || keyHeld.s || keyHeld.d;
}

// --- Manejadores de Eventos de Teclado (WASD = Press & Hold) ---

function handleKeyDown(event) {
  if (!deviceConnected) return;

  const key = event.key.toLowerCase();
  const command = KEY_MAP[key];
  const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

  // 1. Manejo de Movimiento (W, A, S, D)
  if (isMovementKey) {
    if (keyHeld[key]) return; // Ya está presionado
    keyHeld[key] = true;
    // Indicar que hay una acción de movimiento activa en el cliente
    movementActive = true;
    sendCommand(command);
    event.preventDefault(); // Evita scroll de la página
  }
  // 2. Manejo de Pinza (Q, E)
  else if (['q', 'e'].includes(key)) {
    // Pinza: Acción única, no de 'hold', pero prevenimos repetición accidental
    if (keyHeld[key]) return;
    keyHeld[key] = true;
    sendCommand(command);
  }
  // 3. Manejo de Velocidad (Flechas Arriba/Abajo)
  else if (event.key === 'ArrowUp') {
    changeSpeed(1);
  } else if (event.key === 'ArrowDown') {
    changeSpeed(-1);
  }
}

function handleKeyUp(event) {
  if (!deviceConnected) return;

  const key = event.key.toLowerCase();
  const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

  // Si la tecla liberada es de movimiento (W, A, S, D)
  if (isMovementKey) {
    keyHeld[key] = false;
    // Enviar 'X' (STOP) solo si NINGUNA otra tecla de movimiento está actualmente presionada
    if (!isAnyMovementKeyPressed() && movementActive) {
      // Solo enviar STOP si realmente había movimiento activo
      movementActive = false;
      sendCommand('X');
    }
  }
  // Para Q y E (Pinza), liberamos el bloqueo de repetición
  else if (['q', 'e'].includes(key)) {
    keyHeld[key] = false;
  }
}

// --- Manejadores de Eventos de Botón (Ajustados para emular WASD) ---

// El 'key' aquí es 'w', 'a', 's', 'd'. 'button' es el elemento DOM para añadir la clase visual.
function handleButtonDown(key, button) {
  if (!deviceConnected) return;

  const command = KEY_MAP[key];

  // 1. Lógica de Press & Hold (igual que el teclado)
  if (keyHeld[key]) return;
  keyHeld[key] = true;

  // 2. Acción
  // Si es una tecla de movimiento, marcamos movementActive
  if (['w', 'a', 's', 'd'].includes(key)) {
    movementActive = true;
  }
  sendCommand(command);

  // 3. Efecto visual
  button.classList.add('active-btn');
}

function handleButtonUp(key, button) {
  if (!deviceConnected) return;

  // 1. Solo procesamos si el botón que se suelta estaba marcado como presionado.
  if (!keyHeld[key]) return;

  // 2. Desmarcar como presionado.
  keyHeld[key] = false;

  // 3. Enviar STOP ('X') si no queda ninguna tecla/botón de movimiento activo.
  if (!isAnyMovementKeyPressed() && movementActive) {
    movementActive = false;
    sendCommand('X');
  }

  // 4. Efecto visual
  button.classList.remove('active-btn');
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  updateUI(false);
  speedDiv.textContent = `Velocidad: ${speedLevel} (Medio)`;

  // Asignar los listeners de teclado al documento
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
});
