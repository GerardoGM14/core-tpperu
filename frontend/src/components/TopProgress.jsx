import React from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgress() {
  const location = useLocation();
  const [pass, setPass] = React.useState(0); // 0 = oculto, 1 = pasada 1, 2 = pasada 2
  const [progress, setProgress] = React.useState(0);
  const firstRender = React.useRef(true);
  const timers = React.useRef([]);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Pasada 1: 0-500ms
    setPass(1);
    setProgress(0);
    timers.current.push(setTimeout(() => setProgress(100), 20));

    // Pasada 2: 500-1000ms (key cambia → barra se remonta sin animación de retroceso)
    timers.current.push(setTimeout(() => {
      setPass(2);
      setProgress(0);
    }, 500));
    timers.current.push(setTimeout(() => setProgress(100), 520));

    // Ocultar
    timers.current.push(setTimeout(() => setPass(0), 1000));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [location.pathname]);

  if (pass === 0) return null;

  return (
    <div className="topprogress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div key={pass} className="topprogress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
