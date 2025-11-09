import { GiRobotGrab } from 'react-icons/gi';
import PropTypes from 'prop-types';
import './GripperPanel.css';

export function GripperPanel({ connected, onSendCommand }) {
  return (
    <div className="gripper-panel">
      <div className="gripper-header">
        <GiRobotGrab className="gripper-icon" />
        <span className="gripper-label">PINZA</span>
      </div>

      <div className="gripper-controls">
        <button
          className="btn-control btn-gripper-open"
          onClick={() => onSendCommand('Q')}
          aria-label="Abrir pinza"
          disabled={!connected}
        >
          <span className="gripper-emoji">🤏</span>
          <span className="gripper-button-text">ABRIR</span>
        </button>

        <button
          className="btn-control btn-gripper-close"
          onClick={() => onSendCommand('E')}
          aria-label="Cerrar pinza"
          disabled={!connected}
        >
          <span className="gripper-emoji">✊</span>
          <span className="gripper-button-text">CERRAR</span>
        </button>
      </div>
    </div>
  );
}

GripperPanel.propTypes = {
  connected: PropTypes.bool.isRequired,
  onSendCommand: PropTypes.func.isRequired,
};
