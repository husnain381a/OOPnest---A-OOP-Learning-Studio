export const programTop = ['#include <iostream>', 'using namespace std;', 'int main() {'];
export const programBottom = ['    return 0;', '}'];

const escapes: Record<string, string> = { n: '\n', t: '\t', a: '\x07', '\\': '\\', '"': '"' };
type Simulation = { ok: true; output: string; beeps: number; escapesUsed: string[] } | { ok: false; error: string };

export function simulateCout(source: string, lesson = 5): Simulation {
  const fullProgram = /^\s*#include\s*<iostream>\s+using\s+namespace\s+std\s*;\s*int\s+main\s*\(\s*\)\s*\{([\s\S]*?)return\s+0\s*;\s*\}\s*$/;
  const code = (fullProgram.exec(source)?.[1] ?? source).trim();
  const available = ['','', 'n', 'nt', 'nta\\"', 'nta\\"'][lesson] ?? '';
  const used = new Set<string>();
  let cursor = 0;
  let output = '';
  let beeps = 0;

  function take(pattern: RegExp) {
    const match = pattern.exec(code.slice(cursor));
    if (match) cursor += match[0].length;
    return Boolean(match);
  }

  if (!code) return { ok: false, error: 'Pehle ek cout line likho.' };
  while (cursor < code.length) {
    if (!take(/^\s*cout\b/)) return { ok: false, error: 'Har output line cout se shuru karo.' };
    if (!take(/^\s*<</)) return { ok: false, error: 'cout ke baad << chahiye.' };
    do {
      take(/^\s*/);
      if (lesson >= 2 && take(/^endl\b/)) {
        output += '\n';
        continue;
      }
      if (code[cursor++] !== '"') return { ok: false, error: 'Text ke shuru aur aakhir mein double quotes lagao.' };
      let closed = false;
      while (cursor < code.length) {
        const letter = code[cursor++];
        if (letter === '"') { closed = true; break; }
        if (letter === '\n' || letter === '\r') return { ok: false, error: 'Closing quote dekho. Nayi line ke liye line break ka nishaan use karo.' };
        if (letter !== '\\') { output += letter; continue; }
        const escaped = code[cursor++] ?? '';
        if (!escaped || !available.includes(escaped)) return { ok: false, error: 'Backslash ke baad is lesson ka nishaan check karo.' };
        used.add(escaped);
        if (escaped === 'a') beeps++;
        else output += escapes[escaped];
      }
      if (!closed) return { ok: false, error: 'Aakhri double quote missing lag raha hai.' };
    } while (take(/^\s*<</));
    if (!take(/^\s*;\s*/)) return { ok: false, error: 'cout statement ke aakhir mein ; lagao.' };
  }
  return { ok: true, output, beeps, escapesUsed: [...used] };
}
