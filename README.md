# Arduino BLT — Remote control web + ESP32

[![React 18.3.1](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![Vite 5.4.21](https://img.shields.io/badge/Vite-5.4.21-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Prettier 3.6.2](https://img.shields.io/badge/Prettier-3.6.2-F7B93E?logo=prettier&logoColor=white)](https://prettier.io)
[![ESLint 9.39.1](https://img.shields.io/badge/ESLint-9.39.1-4B3263?logo=eslint&logoColor=white)](https://eslint.org)
[![pnpm 10.20.0](https://img.shields.io/badge/pnpm-10.20.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![React Icons 4.12.0](https://img.shields.io/badge/React%20Icons-4.12.0-61DAFB?logo=react&logoColor=white)](https://react-icons.github.io/react-icons/)
[![ESP32](https://img.shields.io/badge/ESP32-supported-2A9D8F)](https://www.espressif.com/en/products/socs/esp32)

Proyecto: interfaz web (React + Vite) para controlar un ESP32 mediante Web Bluetooth.

Resumen
-------
Esta repo contiene:
- Una app frontend React (Vite) que actúa como un control remoto físico para un robot con ESP32.
- Un sketch de Arduino/ESP32 (`arduino.ino`) que expone un servicio BLE y recibe comandos simples (un carácter) para controlar motores y una pinza.

Stack
-----
- Frontend: React 18 + Vite
- Linter / formateo: ESLint + Prettier
- Comunicación BLE: Web Bluetooth API (desde el navegador)
- Microcontrolador: ESP32 con la pila Bluedroid (Arduino sketch en `arduino.ino`)

Estructura relevante
--------------------
- `src/` — código React
  - `src/hooks/useBLE.js` — lógica de conexión y cola de comandos BLE
  - `src/components/*` — UI (ConnectionPanel, MovementPanel, GripperPanel, SpeedPanel, CommandMonitor)
  - `src/styles.css` — estilos principales (estética de control remoto físico)
- `arduino.ino` — sketch del ESP32 (advertising name: `ADCA07`, SERVICE_UUID y CHARACTERISTIC_UUID definidos)
- `.prettierignore` — evita que Prettier formatee archivos `.ino`
- `.vscode/settings.json` *(opcional)* — recomendaciones para desactivar format-on-save para C++/INO en workspace

BLE / Protocolo simple
----------------------
- Nombre del dispositivo BLE (advertised): `ADCA07` (el sketch usa `BLEDevice::init("ADCA07")`).
- SERVICE_UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- CHARACTERISTIC_UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`

Comandos: se envía un solo carácter (ASCII) por escritura BLE. Comandos implementados en el sketch:
- `W` — adelante
- `S` — atrás
- `A` — izquierda
- `D` — derecha
- `X` — stop
- `Q` — abrir pinza
- `E` — cerrar pinza
- `0`..`9` — niveles de velocidad (0 mínimo — 9 máximo)

Notas importantes sobre robustez
--------------------------------
- El hook `useBLE` implementa una cola simple con prioridad: el comando `X` (STOP) tiene prioridad máxima y no puede ser sobrescrito por comandos de movimiento mientras está pendiente.
- El sketch `arduino.ino` evita procesar comandos duplicados repetidos y garantiza que `X` siempre se procese inmediatamente.

Desarrollo & pruebas locales
----------------------------
1. Instala dependencias (usa pnpm):

```bash
pnpm install
```

2. Levantar servidor de desarrollo (Vite):

```bash
pnpm dev
```

Por defecto Vite sirve en `http://localhost:5173`. En desktop puedes usar localhost sin HTTPS y Web Bluetooth funcionará.

Probar en móvil
---------------
- Web Bluetooth en móviles funciona con restricciones:
  - Android: Chrome (recomendado), Edge; Web Bluetooth está soportado
  - iOS: Safari 16.4+ (y navegadores que usan WebKit) soportan Web Bluetooth
- Requisito: **HTTPS obligatorio** en producción. En desarrollo `localhost` funciona sin HTTPS.
- Para probar desde tu teléfono en la misma LAN: inicia Vite, sirve por la IP local (ej.: `http://192.168.1.100:5173`) y usa Chrome/Edge (Android) o Safari (iOS 16.4+).
- Si quieres pruebas con HTTPS en desarrollo, puedes configurar Vite para servir con HTTPS (o usar un túnel como `ngrok` o `localtunnel`).

Flashing / subir `arduino.ino`
-----------------------------
- Abre `arduino.ino` en el IDE de Arduino o PlatformIO.
- Selecciona la placa ESP32 y el puerto correcto.
- Subir el sketch.

Depuración y trazas
-------------------
- El sketch imprime en `Serial` los comandos recibidos y acciones (útil para depuración).
- En el frontend abre la consola del navegador para ver trazas del `useBLE` (se imprimen eventos de teclas, encolado y envío de comandos).

Problemas conocidos y soluciones
--------------------------------
- Síntoma: el robot sigue moviéndose unos instantes después de soltar la tecla.
  - Causa: race entre escritura GATT y nuevos comandos. Solución aplicada: `X` (STOP) tiene prioridad en la cola y el sketch ignora comandos duplicados; además, el cliente resetea teclas cuando la pestaña pierde foco.
- Si el dispositivo NO aparece en la lista de dispositivos BLE en el móvil, prueba a usar `filters: [{ namePrefix: 'ADCA07' }]` (recomendado) porque algunos ESP32 no anuncian el servicio UUID en el advertising packet.

Comandos útiles
---------------
- `pnpm dev` — iniciar servidor de desarrollo
- `pnpm build` — generar build de producción
- `pnpm preview` — preview del build
- `pnpm run lint` — ejecutar ESLint
- `pnpm run format` — ejecutar Prettier (no tocará `*.ino` por la `.prettierignore`)

Contribuir
----------
- Abre un issue describiendo el bug o la mejora.
- Para cambios en el protocolo BLE, comunica también el cambio en el sketch `arduino.ino`.
