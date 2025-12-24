import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'medium', fullScreen = false }) {
  const sizeClass = `spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="loading-overlay">
        <div className={`spinner ${sizeClass}`}>
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`spinner ${sizeClass}`}>
      <div className="spinner-circle"></div>
      <div className="spinner-circle"></div>
      <div className="spinner-circle"></div>
    </div>
  );
}
