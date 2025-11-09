import { useState, useRef, useCallback } from 'react';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const NOTIFY_UUID = '12345678-1234-5678-1234-56789abcdef0'; // Para recibir ACKs

const KEY_MAP = {
  w: 'W',
  s: 'S',
  a: 'A',
  d: 'D',
  q: 'Q',
  e: 'E',
};

export function useBLE() {
  const [connected, setConnected] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(5);
  const [lastCommand, setLastCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [controlMode, setControlMode] = useState('hold'); // 'hold' o 'toggle'

  const deviceRef = useRef(null);
  const charRef = useRef(null);
  const charNotifyRef = useRef(null); // Característica NOTIFY para ACKs
  const writeInProgress = useRef(false);
  const pendingCommand = useRef(null); // Solo UNO pendiente
  const movementActive = useRef(false);
  const keyHeld = useRef({});
  const currentToggleCommand = useRef(null); // Comando activo en modo toggle
  const lastEnqueueTime = useRef(0); // Timestamp del último comando encolado

  // Cola de comandos con ACK
  const queueRef = useRef([]); // Array de {ch: string, retries: number}
  const processingRef = useRef(false);
  const ackResolveRef = useRef(null); // Resolver promise de ACK
  const ackTimeoutRef = useRef(null);

  // Constantes de velocidad
  const MAX_SPEED = 9;
  const MIN_SPEED = 0;
  const INTER_COMMAND_DELAY = 10; // Reducido a 10ms - MTU mayor permite más throughput
  const ACK_TIMEOUT = 500; // Aumentado a 500ms - el Arduino puede estar ocupado procesando
  const MAX_RETRIES = 2; // Reintentos máximos por comando

  // Función helper para resetear todas las teclas y enviar STOP
  const resetAllKeys = useCallback(() => {
    const wasMovementActive = movementActive.current;
    keyHeld.current = {};
    movementActive.current = false;
    currentToggleCommand.current = null; // Limpiar comando toggle

    // Solo enviar STOP si había movimiento activo
    if (wasMovementActive) {
      const c = charRef.current;
      if (c && connected) {
        // Enviar STOP directamente sin usar sendCommand para evitar cola
        const buf = new TextEncoder().encode('X');
        c.writeValue(buf).catch((err) => console.error('Error enviando STOP de emergencia:', err));
        console.log('⚠️ STOP de emergencia enviado - reseteo de teclas');
      }
    }
  }, [connected]);

  const updateUI = useCallback((isConnected) => {
    setConnected(isConnected);
    if (!isConnected) {
      // Limpiar estado al desconectar
      queueRef.current = [];
      processingRef.current = false;
      keyHeld.current = {};
      movementActive.current = false;

      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = null;
      }
      if (ackResolveRef.current) {
        ackResolveRef.current = null;
      }
    }
  }, []);

  // Handler de ACK recibido por notificación
  const handleAck = useCallback((ack) => {
    console.debug('📨 ACK recibido:', ack);
    if (ackResolveRef.current) {
      ackResolveRef.current(ack);
      ackResolveRef.current = null;
      if (ackTimeoutRef.current) {
        clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = null;
      }
    } else {
      console.debug('⚠️ ACK sin espera activa');
    }
  }, []);

  // Procesar cola de comandos con ACK
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const c = charRef.current;
    if (!c) return;

    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      const cmd = item.ch;
      let sent = false;
      let attempt = item.retries;

      while (!sent && attempt <= MAX_RETRIES) {
        try {
          // Enviar comando via GATT
          const buf = new TextEncoder().encode(cmd);
          await c.writeValue(buf);

          // Esperar ACK con timeout
          const ackPromise = new Promise((resolve, reject) => {
            ackResolveRef.current = resolve;
            ackTimeoutRef.current = setTimeout(() => {
              ackResolveRef.current = null;
              reject(new Error('ACK timeout'));
            }, ACK_TIMEOUT);
          });

          const ack = await ackPromise;

          // Validar ACK (debe coincidir con comando enviado)
          if (ack && ack[0] === cmd) {
            sent = true;
            setLastCommand(cmd);
            setCommandHistory((prev) => {
              const newHistory = [...prev, cmd];
              return newHistory.slice(-10);
            });
            console.debug('✅ Comando confirmado:', cmd);
          } else {
            throw new Error(`ACK mismatch: esperado ${cmd}, recibido ${ack}`);
          }
        } catch (err) {
          attempt++;
          console.warn(
            `⚠️ Envío de ${cmd} falló (intento ${attempt}/${MAX_RETRIES + 1}):`,
            err.message
          );
          if (attempt > MAX_RETRIES) {
            console.error(`❌ Descartando comando ${cmd} tras ${MAX_RETRIES} reintentos`);
          } else {
            // Backoff antes de reintentar
            await new Promise((r) => setTimeout(r, 50));
          }
        }
      }

      // Pequeño delay entre comandos exitosos
      if (sent && queueRef.current.length > 0) {
        await new Promise((r) => setTimeout(r, INTER_COMMAND_DELAY));
      }
    }

    processingRef.current = false;
  }, []);

  // Encolar comando (reemplaza a sendCommand para uso normal)
  const enqueueCommand = useCallback(
    (ch) => {
      // 🚨 RATE LIMIT: No permitir más de 1 comando cada 50ms
      // Previene spam de teclas que causa "GATT operation already in progress"
      const now = Date.now();
      const timeSinceLastEnqueue = now - lastEnqueueTime.current;
      if (timeSinceLastEnqueue < 50 && ch !== 'X') {
        console.debug(`⏱️ Rate limit: ignorando ${ch} (${timeSinceLastEnqueue}ms desde último)`);
        return;
      }
      lastEnqueueTime.current = now;

      // 🚨 PROTECCIÓN: Si hay demasiados comandos en cola, ignorar
      // Esto previene "GATT operation already in progress" por spam de teclas
      if (queueRef.current.length >= 5) {
        console.warn(`⚠️ Cola saturada (${queueRef.current.length} comandos) - ignorando ${ch}`);
        return;
      }

      // Prioridad a STOP: si es 'X', limpia la cola y lo pone al frente
      if (ch === 'X') {
        queueRef.current = [{ ch, retries: 0 }];
        console.debug('🛑 STOP prioritario encolado - cola limpiada');
      } else {
        // Evitar duplicados: solo encolar si es diferente al último comando en cola
        const lastInQueue = queueRef.current[queueRef.current.length - 1];
        if (!lastInQueue || lastInQueue.ch !== ch) {
          queueRef.current.push({ ch, retries: 0 });
          console.debug(`📥 Comando ${ch} encolado (cola: ${queueRef.current.length})`);
        } else {
          console.debug(`⏭️ Comando ${ch} duplicado - ignorado (ya en cola)`);
        }
      }

      // Iniciar procesamiento si no está activo
      if (!processingRef.current) {
        processQueue();
      }
    },
    [processQueue]
  );

  // sendCommand original - mantener para compatibilidad o emergencias
  const sendCommand = useCallback(async (ch) => {
    const c = charRef.current;
    if (!c) {
      console.error('Característica BLE no disponible. ¿Estás conectado?');
      return;
    }

    // Si ya hay una escritura en progreso
    if (writeInProgress.current) {
      // Solo guardamos el ÚLTIMO comando pendiente
      // 'X' (STOP) tiene prioridad sobre cualquier otro
      if (ch === 'X' || pendingCommand.current !== 'X') {
        pendingCommand.current = ch;
        console.debug(`⏸️ Comando ${ch} pendiente - escritura en progreso`);
      }
      return;
    }

    writeInProgress.current = true;

    try {
      const buf = new TextEncoder().encode(ch);
      await c.writeValue(buf);
      setLastCommand(ch);
      setCommandHistory((prev) => {
        const newHistory = [...prev, ch];
        return newHistory.slice(-10);
      });
      console.debug('✅ Comando enviado:', ch);
    } catch (err) {
      console.error('Error al escribir en GATT:', err);
    } finally {
      writeInProgress.current = false;

      // Procesar el comando pendiente si existe, con un pequeño delay
      // para no saturar el buffer GATT del ESP32
      if (pendingCommand.current) {
        const next = pendingCommand.current;
        pendingCommand.current = null;

        // Delay de 30ms para darle tiempo al ESP32 de procesar
        setTimeout(() => {
          sendCommand(next);
        }, INTER_COMMAND_DELAY);
      }
    }
  }, []);

  const connectBle = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert(
        '⚠️ Web Bluetooth no está disponible en este navegador.\n\nPor favor usa Chrome, Edge o Opera.'
      );
      return;
    }

    try {
      // Filtrar por nombre del dispositivo (más compatible que por UUID de servicio)
      // El ESP32 debe anunciar un nombre que comience con 'ADCA07'
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ADCA07' }],
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;

      // Escuchar desconexiones
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Dispositivo BLE desconectado');
        updateUI(false);
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      charRef.current = characteristic;

      // Suscribirse a la característica NOTIFY para recibir ACKs
      const characteristicNotify = await service.getCharacteristic(NOTIFY_UUID);
      charNotifyRef.current = characteristicNotify;
      await characteristicNotify.startNotifications();
      characteristicNotify.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        if (value && value.byteLength > 0) {
          const ack = new TextDecoder().decode(value);
          handleAck(ack);
        }
      });
      console.log('✅ Suscrito a notificaciones ACK');

      updateUI(true);

      // Enviar velocidad inicial usando la cola
      enqueueCommand(String(speedLevel));
    } catch (err) {
      console.error('Error al conectar BLE:', err);
      if (err.name === 'NotFoundError') {
        alert(
          '❌ No se encontró el dispositivo ADCA07.\n\nAsegúrate de que el ESP32 esté encendido y cerca.'
        );
      } else if (err.name === 'NotAllowedError') {
        // Usuario canceló el diálogo
        console.log('Usuario canceló la selección de dispositivo');
      } else {
        alert(`Error al conectar: ${err.message}`);
      }
      updateUI(false);
    }
  }, [updateUI, handleAck, enqueueCommand, speedLevel]);

  const disconnectBle = useCallback(() => {
    const d = deviceRef.current;
    if (d && d.gatt && d.gatt.connected) d.gatt.disconnect();
    updateUI(false);
  }, [updateUI]);

  const changeSpeed = useCallback(
    (delta) => {
      if (!connected) return;
      const newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speedLevel + delta));
      if (newSpeed !== speedLevel) {
        setSpeedLevel(newSpeed);
        enqueueCommand(String(newSpeed));
      }
    },
    [connected, speedLevel, enqueueCommand]
  );

  const isAnyMovementKeyPressed = useCallback(() => {
    const h = keyHeld.current;
    return !!(h.w || h.a || h.s || h.d);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (!connected) return;

      const key = (event.key || '').toLowerCase();
      const command = KEY_MAP[key];
      const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

      // 0. ESCAPE - Reseteo de emergencia
      if (event.key === 'Escape' || key === 'x') {
        console.log('🛑 Reseteo manual activado');
        resetAllKeys();
        event.preventDefault();
        return;
      }

      // 1. Manejo de Movimiento (W, A, S, D)
      if (isMovementKey) {
        // MODO TOGGLE: Un solo click inicia movimiento, otro click lo detiene
        if (controlMode === 'toggle') {
          // Si ya hay un comando activo, detenerlo
          if (currentToggleCommand.current) {
            currentToggleCommand.current = null;
            movementActive.current = false;
            console.log(`🔄 Modo Toggle: Deteniendo`);
            enqueueCommand('X');
          }
          // Si no hay comando activo, iniciar este
          else {
            currentToggleCommand.current = command;
            movementActive.current = true;
            console.log(`🔄 Modo Toggle: Iniciando ${key.toUpperCase()}`);
            enqueueCommand(command);
          }
          event.preventDefault();
          return;
        }

        // MODO HOLD (comportamiento actual)
        if (keyHeld.current[key]) {
          console.debug(`⏭️ Tecla ${key.toUpperCase()} ya presionada - ignorando repetición`);
          return; // Ya está presionado
        }
        keyHeld.current[key] = true;
        // Indicar que hay una acción de movimiento activa en el cliente
        movementActive.current = true;
        console.log(`▶️ Tecla ${key.toUpperCase()} presionada`);
        enqueueCommand(command);
        event.preventDefault(); // Evita scroll de la página
      }
      // 2. Manejo de Pinza (Q, E)
      else if (['q', 'e'].includes(key)) {
        // Pinza: Acción única, no de 'hold', pero prevenimos repetición accidental
        if (keyHeld.current[key]) return;
        keyHeld.current[key] = true;
        enqueueCommand(command);
      }
      // 3. Manejo de Velocidad (Flechas Arriba/Abajo)
      else if (event.key === 'ArrowUp') {
        changeSpeed(1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        changeSpeed(-1);
        event.preventDefault();
      }
    },
    [connected, enqueueCommand, changeSpeed, resetAllKeys, controlMode]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (!connected) return;

      // En modo toggle, keyup no hace nada (se controla solo con keydown)
      if (controlMode === 'toggle') return;

      const key = (event.key || '').toLowerCase();
      const isMovementKey = ['w', 'a', 's', 'd'].includes(key);

      // Si la tecla liberada es de movimiento (W, A, S, D)
      if (isMovementKey) {
        if (!keyHeld.current[key]) {
          console.debug(`⚠️ Tecla ${key.toUpperCase()} liberada pero no estaba presionada`);
          return;
        }
        keyHeld.current[key] = false;
        console.log(`⏸️ Tecla ${key.toUpperCase()} liberada`);

        // Enviar 'X' (STOP) solo si NINGUNA otra tecla de movimiento está actualmente presionada
        if (!isAnyMovementKeyPressed() && movementActive.current) {
          // Solo enviar STOP si realmente había movimiento activo
          movementActive.current = false;
          console.log(`🛑 Enviando STOP - ninguna tecla de movimiento activa`);
          enqueueCommand('X');
        } else if (isAnyMovementKeyPressed()) {
          const activeKeys = Object.keys(keyHeld.current).filter((k) => keyHeld.current[k]);
          console.log(`⏩ Otras teclas aún activas: ${activeKeys.join(', ').toUpperCase()}`);
        }
      }
      // Para Q y E (Pinza), liberamos el bloqueo de repetición
      else if (['q', 'e'].includes(key)) {
        keyHeld.current[key] = false;
      }
    },
    [connected, enqueueCommand, isAnyMovementKeyPressed, controlMode]
  );
  const handleButtonDown = useCallback(
    (key) => {
      if (!connected) return;

      const command = KEY_MAP[key];

      // 1. Lógica de Press & Hold (igual que el teclado)
      if (keyHeld.current[key]) return;
      keyHeld.current[key] = true;

      // 2. Acción
      // Si es una tecla de movimiento, marcamos movementActive
      if (['w', 'a', 's', 'd'].includes(key)) {
        movementActive.current = true;
      }
      enqueueCommand(command);
    },
    [connected, enqueueCommand]
  );

  const handleButtonUp = useCallback(
    (key) => {
      if (!connected) return;

      // 1. Solo procesamos si el botón que se suelta estaba marcado como presionado.
      if (!keyHeld.current[key]) return;

      // 2. Desmarcar como presionado.
      keyHeld.current[key] = false;

      // 3. Enviar STOP ('X') si no queda ninguna tecla/botón de movimiento activo.
      if (!isAnyMovementKeyPressed() && movementActive.current) {
        movementActive.current = false;
        enqueueCommand('X');
      }
    },
    [connected, enqueueCommand, isAnyMovementKeyPressed]
  );

  const toggleControlMode = useCallback(() => {
    // Antes de cambiar de modo, detener cualquier movimiento activo
    if (movementActive.current) {
      resetAllKeys();
    }

    setControlMode((prev) => {
      const newMode = prev === 'hold' ? 'toggle' : 'hold';
      console.log(
        `🎮 Modo de control cambiado a: ${newMode === 'hold' ? 'Press & Hold' : 'Toggle'}`
      );
      return newMode;
    });
  }, [resetAllKeys]);

  return {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    controlMode,
    connectBle,
    disconnectBle,
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    sendCommand, // Mantener para compatibilidad
    enqueueCommand, // Nueva función con cola y ACK
    resetAllKeys,
    toggleControlMode,
  };
}
