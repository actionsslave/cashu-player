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
  { id: 'NR-05', pattern: /["'`]http:\/\// },
  { id: 'NR-05', pattern: /["'`]ws:\/\// },
  // NR-03: der Feed-Proxy wird ausschließlich im Feed-Modul verwendet.
  {
    id: 'NR-03',
    pattern: /FEED_PROXY_URL/,
    allow: (path) => path.startsWith('src/feed/') || path === 'src/config/build-config.ts',
  },
];

export function scanSource(files: SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const lines = file.content.split('\n');
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
