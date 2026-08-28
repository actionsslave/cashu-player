/**
 * Prüfseite für A-02: Ist jeder Mint der erlaubten Liste aus dem Browser
 * erreichbar (CORS)? Prüft zugleich A-05 (NUT-11, NUT-12, keine Fees).
 *
 * Die Liste ist editierbar, damit sie vor dem Eintragen echter Werte in
 * src/config/build-config.ts geprüft werden kann.
 */
import { ALLOWED_MINTS } from '../config/build-config.js';
import { summarizeMint, type KeysetLike, type MintInfoLike } from './mint-check.js';

const input = document.getElementById('mints') as HTMLTextAreaElement;
const table = document.getElementById('out') as HTMLTableSectionElement;

input.value = ALLOWED_MINTS.join('\n');

function cell(row: HTMLTableRowElement, text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  row.appendChild(td);
  return td;
}

function yesNo(value: boolean): string {
  return value ? 'ja' : 'NEIN';
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function checkMint(mintUrl: string): Promise<void> {
  const row = document.createElement('tr');
  table.appendChild(row);
  cell(row, mintUrl);
  const verdict = cell(row, 'prüft …');
  const nut11 = cell(row, '');
  const nut12 = cell(row, '');
  const fees = cell(row, '');
  const version = cell(row, '');

  const base = mintUrl.replace(/\/+$/, '');
  try {
    const info = (await getJson(`${base}/v1/info`)) as MintInfoLike;
    let keysets: KeysetLike[] = [];
    try {
      const raw = (await getJson(`${base}/v1/keysets`)) as { keysets?: KeysetLike[] };
      keysets = raw.keysets ?? [];
    } catch (error) {
      fees.textContent = `keysets nicht lesbar: ${String(error)}`;
    }
    const summary = summarizeMint(info, keysets);
    verdict.textContent = 'erreichbar, CORS ok';
    nut11.textContent = yesNo(summary.nut11);
    nut12.textContent = yesNo(summary.nut12);
    if (!fees.textContent) {
      fees.textContent = summary.feeFree ? 'fee-frei' : `${summary.maxInputFeePpk} ppk`;
    }
    version.textContent = `${summary.name} ${summary.version}`;
  } catch (error) {
    verdict.textContent = `FEHLER: ${String(error)} — vermutlich CORS oder nicht erreichbar`;
  }
}

document.getElementById('run')?.addEventListener('click', () => {
  table.replaceChildren();
  const mints = input.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const mint of mints) void checkMint(mint);
});
