import { describe, expect, it } from 'vitest';
import { scanSource } from '../../tools/guardrails.js';

const at = (path: string, content: string) => ({ path, content });

describe('Guardrail-Scanner', () => {
  it('NR-01: findet ein nsec-Eingabefeld', () => {
    const found = scanSource([at('src/ui/login.tsx', '<input name="nsec" />')]);
    expect(found.map((v) => v.rule)).toContain('NR-01');
  });

  it('NR-04: findet Proofs in localStorage', () => {
    const found = scanSource([at('src/wallet/store.ts', "localStorage.setItem('proofs', x)")]);
    expect(found.map((v) => v.rule)).toContain('NR-04');
  });

  it('NR-04: findet Konsolenausgaben', () => {
    const found = scanSource([at('src/wallet/store.ts', 'console.log(proof)')]);
    expect(found.map((v) => v.rule)).toContain('NR-04');
  });

  it('NR-05: findet einen http-Endpunkt', () => {
    const found = scanSource([at('src/config/x.ts', "const m = 'http://mint.example';")]);
    expect(found.map((v) => v.rule)).toContain('NR-05');
  });

  it('NR-05: findet einen ws-Endpunkt', () => {
    const found = scanSource([at('src/config/x.ts', 'const r = "ws://relay.example";')]);
    expect(found.map((v) => v.rule)).toContain('NR-05');
  });

  it('NR-03: findet den Feed-Proxy außerhalb des Feed-Moduls', () => {
    const found = scanSource([at('src/wallet/mint.ts', 'fetch(FEED_PROXY_URL + mintUrl)')]);
    expect(found.map((v) => v.rule)).toContain('NR-03');
  });

  it('NR-03: erlaubt den Feed-Proxy im Feed-Modul', () => {
    const found = scanSource([at('src/feed/fetch.ts', 'fetch(FEED_PROXY_URL + feedUrl)')]);
    expect(found.map((v) => v.rule)).not.toContain('NR-03');
  });

  it('NR-01: schlägt nicht bei Bezeichnern an, die nsec nur enthalten', () => {
    const found = scanSource([at('src/player/tick.ts', 'positionSeconds: number;')]);
    expect(found.map((v) => v.rule)).not.toContain('NR-01');
  });

  it('ignoriert Fundstellen in Zeilenkommentaren', () => {
    const found = scanSource([at('src/db/x.ts', '// localStorage ist gesperrt')]);
    expect(found).toEqual([]);
  });

  it('ignoriert Fundstellen in Blockkommentaren', () => {
    const source = ['/**', ' * Proofs stehen nie in localStorage.', ' */', 'export const x = 1;'].join('\n');
    expect(scanSource([at('src/db/x.ts', source)])).toEqual([]);
  });

  it('findet Verstöße in der Codezeile hinter einem Blockkommentar', () => {
    const source = ['/* Hinweis */', 'console.log(1);'].join('\n');
    expect(scanSource([at('src/db/x.ts', source)]).map((v) => v.rule)).toContain('NR-04');
  });

  it('findet einen Verstoß vor einem Zeilenkommentar in derselben Zeile', () => {
    const found = scanSource([at('src/db/x.ts', 'console.log(1); // Hinweis')]);
    expect(found.map((v) => v.rule)).toContain('NR-04');
  });

  it('NR-05: nimmt die Namespace-Datei von der http-Regel aus', () => {
    const found = scanSource([
      at('src/feed/namespaces.ts', "export const NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';"),
    ]);
    expect(found).toEqual([]);
  });

  it('NR-05: die Ausnahme gilt nur für diese eine Datei', () => {
    const found = scanSource([at('src/feed/parse.ts', "const NS = 'http://beispiel.example';")]);
    expect(found.map((v) => v.rule)).toContain('NR-05');
  });

  it('behandelt // innerhalb eines String-Literals nicht als Kommentar', () => {
    const found = scanSource([at('src/x.ts', "const u = 'https://ok.example'; // Hinweis")]);
    expect(found).toEqual([]);
  });

  it('meldet nichts für unauffälligen Code', () => {
    expect(scanSource([at('src/feed/parse.ts', 'export const x = 1;')])).toEqual([]);
  });

  it('nennt Datei und Zeilennummer jedes Fundes', () => {
    const found = scanSource([at('src/a.ts', 'const ok = 1;\nconsole.log(1);')]);
    expect(found[0]).toMatchObject({ file: 'src/a.ts', line: 2 });
  });
});
