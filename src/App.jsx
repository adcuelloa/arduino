import { useEffect } from 'react';
import { useBLE } from './hooks/useBLE';
import { ConnectionPanel } from './components/ConnectionPanel';
import { SpeedPanel } from './components/SpeedPanel';
import { MovementPanel } from './components/MovementPanel';
import { GripperPanel } from './components/GripperPanel';
import { CommandMonitor } from './components/CommandMonitor';

export default function App() {
  const {
    connected,
    speedLevel,
    lastCommand,
    commandHistory,
    connectBle,
    disconnectBle,
    changeSpeed,
    handleKeyDown,
    handleKeyUp,
    handleButtonDown,
    handleButtonUp,
    sendCommand,
    resetAllKeys,
  } = useBLE();

  useEffect(() => {
    // Manejadores de eventos de teclado
    function onKeyDown(e) {
      handleKeyDown(e);
    }
    function onKeyUp(e) {
      handleKeyUp(e);
    }

    // Manejador para cuando se pierde el foco de la ventana/pestaña
    // Esto previene que las teclas se queden "trabadas" si cambias de pestaña
    function onBlur() {
      console.log('⚠️ Ventana perdió el foco - reseteando teclas');
      resetAllKeys();
    }

    // Manejador para detectar cuando el usuario suelta TODAS las teclas
    // (por ejemplo, Alt+Tab para cambiar de ventana)
    function onVisibilityChange() {
      if (document.hidden) {
        console.log('⚠️ Pestaña oculta - reseteando teclas');
        resetAllKeys();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleKeyDown, handleKeyUp, resetAllKeys]);

  const handleStopClick = () => {
    sendCommand('X');
  };

  return (
    <div className="app-container">
      {/* Control Remoto tipo físico de carro - 16:9 */}
      <div className="remote-control">
        {/* HEADER: Conexión compacta + Velocidad + Monitor */}
        <div className="remote-header">
          <div className="header-left">
            <ConnectionPanel
              connected={connected}
              onConnect={connectBle}
              onDisconnect={disconnectBle}
            />
          </div>

          <div className="header-center">
            <CommandMonitor lastCommand={lastCommand} commandHistory={commandHistory} />
          </div>

          <div className="header-right">
            <SpeedPanel speedLevel={speedLevel} onSpeedChange={changeSpeed} connected={connected} />
          </div>
        </div>

        {/* BODY: Controles principales (D-Pad + Pinza) */}
        <div className="remote-body">
          {/* D-Pad de Movimiento (W/A/S/D + STOP central) */}
          <div className="movement-section">
            <MovementPanel
              connected={connected}
              onButtonDown={(key) => {
                if (key === 'x') {
                  handleStopClick();
                } else {
                  handleButtonDown(key);
                }
              }}
              onButtonUp={handleButtonUp}
            />
          </div>

          {/* Control de Pinza (Abrir/Cerrar) */}
          <div className="gripper-section">
            <GripperPanel connected={connected} onSendCommand={sendCommand} />
          </div>
        </div>
      </div>
    </div>
  );
}
