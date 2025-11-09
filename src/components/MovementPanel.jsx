import { FaCarSide } from 'react-icons/fa';
import PropTypes from 'prop-types';
import './MovementPanel.css';

export function MovementPanel({ connected, onButtonDown, onButtonUp }) {
  return (
    <div className="movement-panel">
      <div className="movement-header">
        <FaCarSide className="movement-icon" />
        <span className="movement-label">MOVIMIENTO</span>
      </div>

      <div className="movement-grid">
        {/* Arriba (W) */}
        <button
          className="btn-control btn-w"
          onMouseDown={() => onButtonDown('w')}
          onMouseUp={() => onButtonUp('w')}
          onMouseLeave={() => onButtonUp('w')}
          onTouchStart={(e) => {
            e.preventDefault();
            onButtonDown('w');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onButtonUp('w');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            onButtonUp('w');
          }}
          aria-label="Mover hacia adelante"
          disabled={!connected}
        />

        {/* Izquierda (A) */}
        <button
          className="btn-control btn-a"
          onMouseDown={() => onButtonDown('a')}
          onMouseUp={() => onButtonUp('a')}
          onMouseLeave={() => onButtonUp('a')}
          onTouchStart={(e) => {
            e.preventDefault();
            onButtonDown('a');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onButtonUp('a');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            onButtonUp('a');
          }}
          aria-label="Girar a la izquierda"
          disabled={!connected}
        />

        {/* Centro STOP */}
        <button
          className="btn-control btn-stop"
          onClick={() => onButtonDown('x')}
          aria-label="Detener movimiento"
          disabled={!connected}
        />

        {/* Derecha (D) */}
        <button
          className="btn-control btn-d"
          onMouseDown={() => onButtonDown('d')}
          onMouseUp={() => onButtonUp('d')}
          onMouseLeave={() => onButtonUp('d')}
          onTouchStart={(e) => {
            e.preventDefault();
            onButtonDown('d');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onButtonUp('d');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            onButtonUp('d');
          }}
          aria-label="Girar a la derecha"
          disabled={!connected}
        />

        {/* Abajo (S) */}
        <button
          className="btn-control btn-s"
          onMouseDown={() => onButtonDown('s')}
          onMouseUp={() => onButtonUp('s')}
          onMouseLeave={() => onButtonUp('s')}
          onTouchStart={(e) => {
            e.preventDefault();
            onButtonDown('s');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onButtonUp('s');
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            onButtonUp('s');
          }}
          aria-label="Mover hacia atrás"
          disabled={!connected}
        />
      </div>
    </div>
  );
}

MovementPanel.propTypes = {
  connected: PropTypes.bool.isRequired,
  onButtonDown: PropTypes.func.isRequired,
  onButtonUp: PropTypes.func.isRequired,
};
