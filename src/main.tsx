import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App';
import './index.css';

/**
 * Il peso delle icone si decide QUI, una volta per tutta l'app: `regular` è il
 * tratto ~2px che corrisponde a quello di Telebi. Per un look più leggero si
 * cambia questa riga (`light`, `thin`), non icona per icona.
 *
 * `size: '1em'` fa ereditare la dimensione dal font del contenitore, così
 * un'icona senza classe di taglia resta comunque proporzionata al testo.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ weight: 'regular', size: '1em' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
