/**
 * Statischer Scanner für die automatisch prüfbaren negativen Anforderungen.
 * Läuft nicht im Bundle, sondern nur in den Tests.
 */

export interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

export interface SourceFile {
  path: string;
  content: string;
}

interface Rule {
  id: string;
  pattern: RegExp;
  /** Datei-Pfade, für die diese Regel nicht gilt. */
  allow?: (path: string) => boolean;
}

const RULES: Rule[] = [
  // NR-01: kein nsec-Eingabefeld, kein privater Schlüssel.
  { id: 'NR-01', pattern: /(?<![A-Za-z0-9_])nsec/i },
  // NR-04: keine Proofs in localStorage oder Konsolenausgaben.
  { id: 'NR-04', pattern: /\blocalStorage\b/ },
  { id: 'NR-04', pattern: /\bconsole\s*\.\s*(log|debug|info|warn|error|table|dir)\b/ },
  // NR-05: keine http- oder ws-Endpunkte.
  {
    id: 'NR-05',
    pattern: /["'`]http:\/\//,
    // XML-Namespace-Bezeichner sind keine Endpunkte und werden nie abgerufen.
    allow: (path) => path === 'src/feed/namespaces.ts',
  },
  { id: 'NR-05', pattern: /["'`]ws:\/\// },
  // NR-03: der Feed-Proxy wird ausschließlich im Feed-Modul verwendet.
  {
    id: 'NR-03',
    pattern: /FEED_PROXY_URL/,
    allow: (path) => path.startsWith('src/feed/') || path === 'src/config/build-config.ts',
  },
];

/**
 * Ersetzt Kommentare zeilenweise durch Leerraum. Die Regeln zielen auf Code;
 * ein Kommentar, der eine verbotene Konstruktion erklärt, ist kein Verstoß.
 * String-Literale bleiben stehen — dort steckt gerade das, was NR-05 sucht.
 * Zeilennummern bleiben erhalten, weil nur der Inhalt geleert wird.
 */
function stripComments(source: string): string[] {
  type State = 'code' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';

  return source.split('\n').map((line) => {
    let out = '';
    let index = 0;

    while (index < line.length) {
      const char = line[index];
      const pair = line.slice(index, index + 2);

      if (state === 'block') {
        if (pair === '*/') {
          state = 'code';
          index += 2;
        } else {
          index += 1;
        }
        continue;
      }

      if (state !== 'code') {
        out += char;
        if (char === '\\') {
          out += line[index + 1] ?? '';
          index += 2;
          continue;
        }
        const closes =
          (state === 'single' && char === "'") ||
          (state === 'double' && char === '"') ||
          (state === 'template' && char === '`');
        if (closes) state = 'code';
        index += 1;
        continue;
      }

      if (pair === '//') return out;
      if (pair === '/*') {
        state = 'block';
        index += 2;
        continue;
      }
      if (char === "'") state = 'single';
      else if (char === '"') state = 'double';
      else if (char === '`') state = 'template';
      out += char;
      index += 1;
    }

    // Einfache Strings enden am Zeilenende; nur Template-Literale laufen weiter.
    if (state === 'single' || state === 'double') state = 'code';
    return out;
  });
}

export function scanSource(files: SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const lines = stripComments(file.content);
    for (const rule of RULES) {
      if (rule.allow?.(file.path)) continue;
      lines.forEach((text, index) => {
        if (rule.pattern.test(text)) {
          violations.push({ file: file.path, line: index + 1, rule: rule.id, text: text.trim() });
        }
      });
    }
  }
  return violations;
}
