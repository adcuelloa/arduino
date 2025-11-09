import { FaTachometerAlt, FaPlus, FaMinus } from 'react-icons/fa';
import PropTypes from 'prop-types';
import './SpeedPanel.css';

export function SpeedPanel({ speedLevel, onSpeedChange, connected }) {
  return (
    <div className="speed-panel">
      <div className="speed-header">
        <FaTachometerAlt className="speed-icon" />
        <span className="speed-label">VELOCIDAD</span>
      </div>
      <div className="speed-display">{speedLevel}</div>
      <div className="speed-controls">
        <button
          className="btn-control btn-speed-up"
          onClick={() => onSpeedChange(1)}
          aria-label="Aumentar velocidad"
          disabled={!connected}
        >
          <FaPlus />
        </button>
        <button
          className="btn-control btn-speed-down"
          onClick={() => onSpeedChange(-1)}
          aria-label="Disminuir velocidad"
          disabled={!connected}
        >
          <FaMinus />
        </button>
      </div>
    </div>
  );
}

SpeedPanel.propTypes = {
  speedLevel: PropTypes.number.isRequired,
  onSpeedChange: PropTypes.func.isRequired,
  connected: PropTypes.bool.isRequired,
  compact: PropTypes.bool,
};
