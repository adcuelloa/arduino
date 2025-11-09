# Modos de Control del Robot

## Problema Original

Cuando se mantiene una tecla presionada en modo **Press & Hold**, el sistema envía **muchos comandos por segundo** (hasta 100+), lo que puede causar:

- Sobrecarga de la cola de comandos BLE
- Latencia acumulada en el procesamiento
- Posibilidad de que comandos se pierdan o demoren
- Dificultad del Arduino para seguir el ritmo

## Solución: Dos Modos de Control

Ahora el usuario puede elegir entre dos modos de operación:

### 🎮 Modo 1: **Press & Hold** (Tradicional)

**Funcionamiento:**
- Mantienes la tecla presionada → El robot se mueve continuamente
- Sueltas la tecla → El robot se detiene inmediatamente
- Ideal para control preciso y maniobras delicadas

**Cuándo usar:**
- Cuando necesitas control fino (estacionar, ajustar posición)
- Para movimientos cortos y rápidos
- Cuando quieres respuesta inmediata al soltar la tecla

**Ventajas:**
- Control intuitivo (como un videojuego)
- Detención automática al soltar
- Soporte para múltiples teclas simultáneas (ej: W+A para diagonal)

**Desventajas:**
- Genera muchos comandos BLE por segundo
- Puede saturar el buffer en conexiones lentas
- Requiere mantener atención constante

---

### 🔄 Modo 2: **Toggle** (Nuevo)

**Funcionamiento:**
- Presionas **una vez** → El robot inicia movimiento
- Presionas **otra vez** (cualquier tecla) → El robot se detiene
- El movimiento continúa hasta que lo detengas manualmente

**Cuándo usar:**
- Para movimientos largos y rectos (cruzar una habitación)
- Cuando quieres menos carga en el sistema BLE
- Para conservar batería del robot (menos comandos repetidos)

**Ventajas:**
- **Solo 1 comando por acción** (vs 100+ en Press & Hold)
- Reduce carga en BLE y Arduino dramáticamente
- Ideal para conexiones con latencia
- Menos esfuerzo para el usuario (no mantener tecla)

**Desventajas:**
- Requiere presionar dos veces para detener (menos intuitivo)
- No soporta múltiples direcciones simultáneas
- Necesitas estar atento para detener manualmente

---

## Comparación de Performance

### Escenario: Mover el robot hacia adelante por 5 segundos

| Aspecto | Press & Hold | Toggle |
|---------|-------------|---------|
| **Comandos enviados** | ~500 comandos 'W' + 1 STOP | **2 comandos** (1 'W', 1 STOP) |
| **Uso de BLE** | Alto (100 writes/segundo) | **Mínimo** (solo 2 writes) |
| **Latencia acumulada** | Puede crecer con el tiempo | **Cero** (no hay cola) |
| **Riesgo de timeout** | Medio-Alto | **Muy bajo** |
| **Carga en Arduino** | Alta (procesar 100 comandos/seg) | **Mínima** |

---

## Cómo Cambiar de Modo

### En la Interfaz

1. Busca el botón **🎮** en la parte superior izquierda (al lado del botón de conexión)
2. El botón muestra el modo actual:
   - `🎮 Press & Hold` → Estás en modo tradicional
   - `🎮 Toggle` → Estás en modo toggle
3. Click en el botón para cambiar de modo
4. **Al cambiar, el robot se detiene automáticamente** (por seguridad)

### Logs en Consola

Cuando cambias de modo, verás:
```
🎮 Modo de control cambiado a: Press & Hold
```
o
```
🎮 Modo de control cambiado a: Toggle
```

---

## Comportamiento Detallado

### Modo Press & Hold

```
Usuario presiona W → btSignal = 'W', movimiento continuo
Usuario mantiene W → Se siguen enviando comandos 'W' cada 10ms
Usuario suelta W → Se envía 'X' (STOP), robot se detiene
```

**Logs típicos:**
```
▶️ Tecla W presionada
📥 Comando W encolado (cola: 1)
✅ Comando W enviado exitosamente
🔔 ACK recibido: W
... (se repite mientras mantienes la tecla) ...
⏸️ Tecla W liberada
🛑 Enviando STOP - ninguna tecla de movimiento activa
📥 Comando X encolado (cola: 1)
✅ Comando X enviado exitosamente
```

---

### Modo Toggle

```
Usuario presiona W (primera vez) → btSignal = 'W', movimiento continuo
Robot sigue moviéndose indefinidamente (sin enviar más comandos)
Usuario presiona cualquier tecla → Se envía 'X' (STOP), robot se detiene
```

**Logs típicos:**
```
🔄 Modo Toggle: Iniciando W
📥 Comando W encolado (cola: 1)
✅ Comando W enviado exitosamente
🔔 ACK recibido: W
... (silencio - sin más comandos) ...
🔄 Modo Toggle: Deteniendo
📥 Comando X encolado (cola: 1)
✅ Comando X enviado exitosamente
```

**Nota:** En Toggle, solo se envían **2 comandos total** vs cientos en Press & Hold.

---

## Casos de Uso Recomendados

### Usar Press & Hold cuando:

- ✅ Estás aprendiendo a manejar el robot
- ✅ Necesitas precisión (estacionar, girar en ángulo específico)
- ✅ Estás en un espacio pequeño con muchos obstáculos
- ✅ Quieres control "reactivo" (soltar = detener inmediato)
- ✅ Tienes buena conexión BLE (baja latencia, sin pérdidas)

### Usar Toggle cuando:

- ✅ Vas a moverte en línea recta por varios segundos
- ✅ Experimentas lag o "quedadas" en Press & Hold
- ✅ La conexión BLE es inestable o lenta
- ✅ Quieres reducir carga en el Arduino (batería, temperatura)
- ✅ Prefieres menos comandos y más simplicidad
- ✅ Estás en espacio abierto sin necesidad de ajustes constantes

---

## Recomendación Técnica

**Para la mayoría de usuarios:**
- Comienza con **Toggle** para ver si resuelve los problemas de latencia
- Si Toggle funciona bien, es más eficiente para el sistema
- Cambia a Press & Hold solo si necesitas control más fino

**Si experimentas "quedadas" frecuentes:**
- **Definitivamente usa Toggle** - reduce la carga BLE en 99%
- Verifica que compilaste el nuevo `arduino.ino` (sin el bug de `pulseIn`)
- Considera aumentar `ACK_TIMEOUT` si aún tienes problemas

---

## Implementación Técnica

### Estado del Modo

```javascript
const [controlMode, setControlMode] = useState('hold'); // 'hold' o 'toggle'
const currentToggleCommand = useRef(null); // Comando activo en toggle
```

### Lógica de Toggle

```javascript
if (controlMode === 'toggle') {
  // Si ya hay comando activo, detener
  if (currentToggleCommand.current) {
    currentToggleCommand.current = null;
    enqueueCommand('X');
  } 
  // Si no, iniciar este comando
  else {
    currentToggleCommand.current = command;
    enqueueCommand(command);
  }
  return;
}
```

### Seguridad al Cambiar Modo

```javascript
const toggleControlMode = useCallback(() => {
  // Detener cualquier movimiento antes de cambiar
  if (movementActive.current) {
    resetAllKeys();
  }
  setControlMode(prev => prev === 'hold' ? 'toggle' : 'hold');
}, [resetAllKeys]);
```

---

## Troubleshooting

### "En Toggle, el robot no se detiene al presionar otra tecla"

**Causa:** Bug en el código o pérdida de evento keydown  
**Solución:**
1. Presiona `Escape` para reset de emergencia
2. Verifica logs de consola para confirmar que el modo es 'toggle'
3. Recarga la página y reconecta

### "En Press & Hold, el robot se sigue moviendo después de soltar"

**Causa:** Evento keyup no se disparó  
**Solución:**
1. Presiona `Escape` para detener inmediatamente
2. **Cambia a modo Toggle** - esto elimina la dependencia de keyup
3. Si persiste, revisa que compilaste el nuevo arduino.ino

### "El modo no cambia al hacer click en el botón"

**Causa:** Error en React state  
**Solución:**
1. Abre consola del navegador
2. Busca errores de JavaScript
3. Recarga la página completamente (Ctrl+Shift+R)

---

## Conclusión

La implementación de **dos modos de control** te da flexibilidad:

- **Toggle** → Máxima eficiencia, mínima carga BLE ⚡
- **Press & Hold** → Máximo control, respuesta inmediata 🎮

Experimenta con ambos y usa el que mejor se adapte a tu situación. En general, **Toggle debería eliminar completamente los problemas de "quedadas"** porque reduce la cantidad de comandos BLE en ~99%.
