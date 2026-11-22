import { calculationResults, lessons, type Edge, type Lesson, type Problem, type Shape, type Stage } from './curriculum.ts';
import { simulateCout } from './cout.ts';

export { lessons };
export const ipoOrder = [2, 0, 1] as const;
export const ipoLabels = ['Input', 'Processing', 'Output'];
export const shapes: { type: Shape; label: string }[] = [
  { type: 'start', label: 'Start' }, { type: 'end', label: 'End' }, { type: 'io', label: 'Input / Output' },
  { type: 'process', label: 'Process' }, { type: 'decision', label: 'Decision' },
];
export type FlowAnswer = { shapes: Record<string, Shape>; edges: Edge[] };
export type Answer = number[] | string | FlowAnswer | { choice: number; reason: string; second?: string } | { text: string; beep: boolean };
export type Action = { id: string; lessonId: string; stage: Stage; type: 'check' | 'hint'; answer?: Answer };
export type Result = { ok: boolean; message: string; topic: string; points: number };
export type RecordRow = { lesson_id: string; stage: Stage; type: 'check' | 'hint'; ok: boolean; points: number; topic: string; created_at: string; answer?: Answer };

const rewards: Record<Stage, number> = { ipo: 10, steps: 10, write: 0, flow: 20, compare: 0, pseudo: 10, quiz: 10, predict: 15, code: 20 };

export function jumble(length: number) {
  return Array.from({ length }, (_, index) => (length - index + 1) % length);
}

const stageHints: Record<Stage, string[]> = {
  ipo: ['Shuru se pehle kya chahiye?', 'Jo kaam tum karti ho woh Processing hai.', 'Aakhir mein jo milta hai woh Output hai.'],
  steps: ['Jo kaam sab se pehle karna hai, usay upar lao.', 'Har line par socho: is se pehle kya ready hona chahiye?', 'Jo result milta hai usay aakhir mein rakho.'],
  write: ['Har line mein ek chhota kaam likho.', 'Shuru, beech ka kaam aur end cover karo.', '4 se 8 lines mein apna tareeqa likho.'],
  flow: ['Ek Start aur ek End shape chahiye.', 'Input aur Output ki shape ek hi hoti hai.', 'Arrows shuru se end tak dekho. Sawal ho to Yes aur No ke raaste dekho.'],
  compare: ['Dono ways ko situation ke saath dekho.', 'Time, cheezein aur result compare karo.', 'Reason mein situation ki ek baat use karo.'],
  pseudo: ['Pehli line mein kaunsi values chahiye?', 'Calculation ko chhotay steps mein likho.', 'Aakhri line mein woh result likho jo dikhana hai.'],
  quiz: ['Dono options ka wait time dekho.', 'Class shuru honay tak kitna waqt hai?', 'Apni choice ke saath time ka reason likho.'],
  predict: ['Quotes ke andar se shuru karo.', 'Nishaan aur spaces ka asar socho.', 'Output mein sirf woh likho jo screen par dikhay ga.'],
  code: ['Text double quotes ke andar hona chahiye.', 'cout ke baad << aur line ke end par ; dekho.', 'Output task mein jo diya hai us se match karo.'],
};

export function hintFor(lesson: Lesson, stage: Stage, before: number) {
  if (lesson.kind === 'problem' && ['steps', 'write', 'pseudo'].includes(stage) && before === 1) return lesson.nudge;
  if (lesson.kind === 'code' && stage === 'code' && before === 1) return lesson.hint;
  return stageHints[stage][Math.min(before, 2)];
}

const has = (text: string, group: string) => group.split('|').some(word => text.toLowerCase().includes(word));
const lines = (text: string) => text.split(/\r?\n/).map(line => line.replace(/^\s*(?:[-•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
const canonical = (text: string) => text.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, ' ').trim();

function textIssues(value: string, problem: Problem, asPseudo = false) {
  const steps = lines(value);
  const min = asPseudo ? 3 : 4;
  if (steps.length < min || steps.length > 8 || steps.some(line => canonical(line).length < 4)) {
    return `Har line par ek kaam. ${min} se 8 clear steps likho.`;
  }
  if (new Set(steps.map(canonical)).size !== steps.length) return 'Do lines same lag rahi hain. Har line par ek alag kaam likho.';
  if (asPseudo && !value.split(/\r?\n/).filter(line => line.trim()).every((line, index) => new RegExp(`^\\s*${index + 1}[.)]\\s*`).test(line))) {
    return 'Har line ko 1., 2., 3. is tarah number do.';
  }
  const covered = problem.keywords.filter(group => has(value, group)).length;
  const minimum = asPseudo ? problem.keywords.length : Math.max(2, problem.keywords.length - 1);
  if (covered < minimum) return problem.nudge;
  const expected = calculationResults[problem.id];
  if (asPseudo && expected) {
    const finalLine = steps.at(-1) ?? '';
    const numbers = (finalLine.replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (numbers.length === 0) return 'Aakhri line mein apna final number bhi likho.';
    if (numbers.length !== expected.length || expected.some((value, index) => numbers[index] !== value)) return problem.nudge;
  }
  return null;
}

function edgeKey(edge: Edge) { return `${edge.from}:${edge.to}:${edge.label ?? ''}`; }

function gradeFlow(problem: Problem, answer: Answer | undefined) {
  const graph = answer as FlowAnswer | undefined;
  const picked = graph?.shapes ?? {};
  const arrows = Array.isArray(graph?.edges) ? graph.edges.filter(edge => edge && typeof edge === 'object') : [];
  const expected = problem.flow;

  if (picked.start !== 'start') return ['Start shape check karo.', 'flow-start'];
  if (picked.end !== 'end') return ['End shape check karo.', 'flow-end'];
  if (picked.input !== 'io' || picked.output !== 'io') return ['Jo shuru mein chahiye aur jo aakhir mein milta hai, un dono ki shape check karo.', 'flow-io'];
  if (problem.decision && picked.decision !== 'decision') return ['Jahan sawal poocha hai, us card ki shape check karo.', 'flow-decision'];
  if (expected.cards.some(card => picked[card.id] !== card.shape)) return ['Jis card mein kaam ho raha hai, uski shape check karo.', 'flow-process'];

  if (problem.decision) {
    const branches = arrows.filter(edge => edge.from === 'decision');
    const needed = expected.edges.filter(edge => edge.from === 'decision');
    if (branches.length !== 2 || needed.some(edge => !branches.some(branch => edgeKey(edge) === edgeKey(branch)))) {
      return ['Decision ke baad Yes aur No ke do sahi raaste hone chahiye.', 'flow-decision'];
    }
  }
  const actual = new Set(arrows.map(edgeKey));
  if (arrows.length !== expected.edges.length || expected.edges.some(edge => !actual.has(edgeKey(edge)))) {
    return ['Arrows follow karo. Har step se aglay step tak raasta check karo.', 'flow-arrows'];
  }
  return null;
}

export function grade(lesson: Lesson, stage: Stage, answer: Answer | undefined, original?: Answer): Result {
  const fail = (message: string, topic: string = stage): Result => ({ ok: false, message, topic, points: 0 });
  const pass = (message = 'Bilkul sahi! Agla step ready hai.', points = rewards[stage]): Result => ({ ok: true, message, topic: stage, points });

  if (lesson.kind === 'problem') {
    if (stage === 'ipo') return Array.isArray(answer) && answer.length === 3 && ipoOrder.every((item, index) => answer[index] === item)
      ? pass('Sahi! Input se shuru, Processing mein kaam, aur Output mein result.')
      : fail('Socho kya cheez pehle se hai aur kya cheez aakhir mein milay gi.');
    if (stage === 'steps') return Array.isArray(answer) && answer.length === lesson.steps.length && lesson.steps.every((_, index) => answer[index] === index)
      ? pass('Sahi order! Har step aglay kaam ke liye tayyar hai.')
      : fail('Shuru wali cheez aur aakhri result dekho. Phir beech ke steps dobara socho.');
    if (stage === 'write' || stage === 'pseudo') {
      const issue = textIssues(typeof answer === 'string' ? answer : '', lesson, stage === 'pseudo');
      return issue ? fail(issue) : pass('Shabash! Tum ne apna tareeqa clear steps mein likha.');
    }
    if (stage === 'flow') {
      const issue = gradeFlow(lesson, answer);
      return issue ? fail(issue[0], issue[1]) : pass('Sahi! Shapes aur arrows mil kar steps dikhate hain.');
    }
  }

  if ((stage === 'compare' || stage === 'quiz') && lesson.kind !== 'code' && lesson.comparison) {
    const response = answer as { choice: number; reason: string; second?: string } | undefined;
    const { comparison } = lesson;
    if (response?.choice !== comparison.better) return fail('Situation mein jo limit di hai, usay dono ways ke saath check karo.');
    if (typeof response.reason !== 'string' || canonical(response.reason).length < 8 || !has(response.reason, comparison.reason)) {
      return fail('Ek sentence mein batao ye choice is situation mein kyun kaam karti hai.');
    }
    if (stage === 'compare' && typeof response.second === 'string' && response.second.trim() && lesson.kind === 'problem') {
      const first = typeof original === 'string' ? original : '';
      const next = response.second;
      const secondIssue = textIssues(next, lesson);
      if (secondIssue) return fail(`Doosra tareeqa dekho. ${secondIssue}`);
      const usesDifferentWay = comparison.anchors.some((group, index) =>
        has(first, group) && has(next, comparison.anchors[1 - index]) && !has(next, group));
      if (!usesDifferentWay || canonical(first) === canonical(next)) return fail('Doosray tareeqay mein asal change clear karo. Dono options alag tareeqay dikhate hain.');
      return pass('Do alag tareeqay aur clear reason. Bonus mil gaya!', 10);
    }
    return pass('Sahi choice. Tum ne situation ko dekh kar reason diya.');
  }

  if (lesson.kind === 'code' && stage === 'predict') {
    const predicted = answer as { text: string; beep: boolean } | undefined;
    const expected = simulateCout(lesson.sample, lesson.lesson);
    if (expected.ok && typeof predicted?.text === 'string' && predicted.text.replace(/\r\n/g, '\n') === expected.output && Boolean(predicted.beep) === Boolean(expected.beeps)) {
      return pass('Sahi prediction! Ab code mein chhota sa change karo.');
    }
    return fail('Quotes ka text, nayi line, aur spaces dhyaan se dekho. Phir try karo.');
  }

  if (lesson.kind === 'code' && stage === 'code') {
    const result = simulateCout(typeof answer === 'string' ? answer : '', lesson.lesson);
    if (!result.ok) return fail(result.error, 'code-format');
    const output = result.output.replace(/\n$/, '');
    const matches = [
      () => output === 'Salaam',
      () => output === 'Ready\nGo' && result.escapesUsed.includes('n'),
      () => output === 'Sara\t07' && result.escapesUsed.includes('t'),
      () => output === '"Saved" \\' && result.beeps === 1,
      () => /^Name\t[^\n\t]+\nClass\t[^\n\t]+\nLike\t[^\n\t]+$/.test(output) && output.split('\n').every(row => row.split('\t')[1].trim()),
    ][lesson.lesson - 1]();
    return matches ? pass('Shabash! Output task se match karta hai.') : fail(lesson.hint);
  }
  return fail('Is activity ko dobara open karo.');
}

export function currentActivity(records: RecordRow[], lesson: Lesson) {
  const passed = new Map(records.filter(row => row.lesson_id === lesson.id && row.type === 'check' && row.ok).map(row => [row.stage, row]));
  const index = lesson.stages.findIndex(stage => !passed.has(stage));
  return { passed, index, done: index === -1 };
}

export const lessonFor = (id: string) => lessons.find(lesson => lesson.id === id);
export const lessonReady = (lesson: Lesson, rows: RecordRow[]) => {
  const position = lessons.indexOf(lesson);
  return position === 0 || currentActivity(rows, lessons[position - 1]).done;
};

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' });
export const activityDay = (date: Date) => dateFormat.format(date);

export function summarize(rows: RecordRow[], now = new Date()) {
  const results = new Map<string, Set<Stage>>();
  const days = new Set<string>();
  const scores = [0, 0, 0];
  for (const row of rows) {
    const lesson = lessonFor(row.lesson_id);
    if (!lesson) continue;
    scores[lesson.module - 1] += row.points;
    days.add(activityDay(new Date(row.created_at)));
    if (row.type === 'check' && row.ok) {
      const stages = results.get(row.lesson_id) ?? new Set<Stage>();
      stages.add(row.stage);
      results.set(row.lesson_id, stages);
    }
  }
  const completed = lessons.filter(lesson => lesson.stages.every(stage => results.get(lesson.id)?.has(stage)));
  const cursor = new Date(now);
  if (!days.has(activityDay(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(activityDay(cursor))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  const badges: string[] = [];
  if (completed.filter(lesson => lesson.module === 1).length === 11) badges.push('Step Master');
  if (completed.filter(lesson => lesson.module === 2).length === 8) badges.push('Hisab Hero');
  if (results.get('hello')?.has('code')) badges.push('First Coder');
  return { completed, scores: scores.map(score => Math.max(0, score)), total: Math.max(0, scores.reduce((a, b) => a + b, 0)), streak, badges,
    percent: Math.round(completed.length / lessons.length * 100) };
}
