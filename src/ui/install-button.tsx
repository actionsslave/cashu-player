/**
 * FR-32: eigene Schaltfläche für die Installation. Sie erscheint nur, wenn der
 * Browser die Installation anbietet und die App nicht schon installiert läuft.
 */
import { useEffect, useState } from 'preact/hooks';
import {
  isStandalone,
  watchInstallPrompt,
  type InstallPromptEvent,
} from '../pwa/install-prompt.js';

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | undefined>(undefined);
  const [installed] = useState(isStandalone);

  useEffect(() => watchInstallPrompt(setPrompt), []);

  if (installed || !prompt) return null;

  return (
    <button
      type="button"
      class="install"
      onClick={() => {
        void prompt.prompt();
        // Ein Ereignis lässt sich nur einmal verwenden.
        setPrompt(undefined);
      }}
    >
      Installieren
    </button>
  );
}
