import PropTypes from 'prop-types';
import { FiActivity } from 'react-icons/fi';
import './CommandMonitor.css';

export function CommandMonitor({ lastCommand, commandHistory, compact }) {
  // Mapeo de comandos a descripciones legibles
  const getCommandDescription = (cmd) => {
    const descriptions = {
      W: '⬆️ ADELANTE',
      S: '⬇️ ATRÁS',
      A: '⬅️ IZQUIERDA',
      D: '➡️ DERECHA',
      X: '⏹️ STOP',
      Q: '🤏 ABRIR PINZA',
      E: '✊ CERRAR PINZA',
      0: '🐌 VELOCIDAD: 0',
      1: '🐌 VELOCIDAD: 1',
      2: '🚶 VELOCIDAD: 2',
      3: '🚶 VELOCIDAD: 3',
      4: '🚶 VELOCIDAD: 4',
      5: '🏃 VELOCIDAD: 5',
      6: '🏃 VELOCIDAD: 6',
      7: '🏃 VELOCIDAD: 7',
      8: '🚀 VELOCIDAD: 8',
      9: '🚀 VELOCIDAD: 9',
    };
    return descriptions[cmd] || `📡 ${cmd}`;
  };

  if (compact) {
    return (
      <div className="command-monitor compact">
        <div className="monitor-history compact-history">
          {commandHistory
            .slice(-5)
            .reverse()
            .map((cmd, index) => (
              <div key={`${cmd}-${index}`} className="history-item">
                {getCommandDescription(cmd)}
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="command-monitor">
      {/* Panel principal con último comando */}
      <div className="monitor-main">
        <div className="monitor-icon">
          <FiActivity />
        </div>
        <div className="monitor-content">
          <div className="monitor-label">COMANDO ACTUAL</div>
          <div className="monitor-command">
            {lastCommand ? getCommandDescription(lastCommand) : '---'}
          </div>
        </div>
      </div>

      {/* Historial de comandos (últimos 3) */}
      <div className="monitor-history">
        {commandHistory.slice(-3).map((cmd, index) => (
          <div
            key={`${cmd}-${index}-${Date.now()}`}
            className="history-item"
            style={{ opacity: 1 - index * 0.3 }}
          >
            {getCommandDescription(cmd)}
          </div>
        ))}
      </div>
    </div>
  );
}

CommandMonitor.propTypes = {
  lastCommand: PropTypes.string,
  commandHistory: PropTypes.arrayOf(PropTypes.string).isRequired,
  compact: PropTypes.bool,
};
