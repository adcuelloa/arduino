import { FaBluetoothB } from 'react-icons/fa';
import PropTypes from 'prop-types';
import './ConnectionPanel.css';

export function ConnectionPanel({ connected, onConnect, onDisconnect }) {
  return (
    <div className="connection-panel">
      <button
        className={`connection-round ${connected ? 'connected' : 'disconnected'}`}
        onClick={connected ? onDisconnect : onConnect}
        aria-label={connected ? 'Desconectar' : 'Conectar'}
        title={connected ? 'Desconectar' : 'Conectar'}
      >
        <FaBluetoothB className="round-icon" />
        <span className="sr-only">{connected ? 'Conectado' : 'Desconectado'}</span>
      </button>
    </div>
  );
}

ConnectionPanel.propTypes = {
  connected: PropTypes.bool.isRequired,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
};
