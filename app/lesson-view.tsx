import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp,
  Code2, CornerUpLeft, Languages, Lightbulb, Play, RotateCcw, Route,
} from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { stageNames, stagesFor, type Flowchart, type Lesson, type Question, type Stage } from '../lib/content';
import { supabase } from '../lib/supabase';
import type { LessonRecord, Work, useWorkspace } from '../lib/use-workspace';

type Props = {
  lesson: Lesson;
  number: number;
  mood: string;
  record: LessonRecord;
  signedIn: boolean;
  save: ReturnType<typeof useWorkspace>['save'];
  next: (() => void) | undefined;
  back: () => void;
  signIn: () => void;
};

const requiredMethods = 'Write at least two steps, each on its own line. Short phrases are fine.';
const emptyChoice = -1;

function hasTwoSteps(value = '') {
  return new Set(value.split('\n').map(line => line.trim().toLowerCase().replace(/^[-*\d.)\s]+/, '')).filter(Boolean)).size >= 2;
}

function distinctMethods(first = '', second = '') {
  const words = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return words(first) !== words(second);
}

function initialDraft(lesson: Lesson, work: Work): Work {
  return {
    ...work,
    ipo: work.ipo ?? [emptyChoice, emptyChoice, emptyChoice],
    chart: work.chart ?? lesson.chart.nodes.map(() => emptyChoice),
  };
}

function checkWork(lesson: Lesson, stage: Stage, work: Work) {
  switch (stage) {
    case 'ipo': {
      if (!work.ipo || work.ipo.includes(emptyChoice)) return { missing: 'Choose an answer for all three questions.' };
      const different = lesson.ipo.findIndex((question, index) => work.ipo?.[index] !== question.correct);
      const hint = different < 0 ? undefined : `${['Input', 'Processing', 'Output'][different]}. ${lesson.ipo[different].hint}`;
      return { hint, praise: lesson.ipo.map(question => question.why).join(' ') };
    }
    case 'steps':
      if (!hasTwoSteps(work.method)) return { missing: requiredMethods };
      return checkChoice(lesson.steps, work.stepAnswer);
    case 'chart':
      if (!work.chart || work.chart.includes(emptyChoice)) return { missing: 'Choose a tile for each empty box on the map.' };
      return {
        hint: lesson.chart.order.some((node, index) => work.chart?.[index] !== node) ? lesson.chart.hint : undefined,
        praise: 'The arrows now lead through your plan in the right order.',
      };
    case 'compare':
      if (!hasTwoSteps(work.alternate)) return { missing: requiredMethods };
      if (!distinctMethods(work.method, work.alternate)) return { missing: 'Change something about your second way, then write its steps.' };
      if ((work.reason?.trim().length ?? 0) < 3) return { missing: 'Add a short reason for your choice.' };
      return checkChoice(lesson.compare, work.comparison);
    case 'code':
      return checkChoice(lesson.code!.question, work.prediction);
  }
}

function checkChoice(question: Question, answer: number | undefined) {
  return answer === undefined
    ? { missing: 'Pick an answer to check your idea.' }
    : { hint: answer === question.correct ? undefined : question.hint, praise: question.why };
}

function ChoiceList({ question, value, onChange, name }: {
  question: Question; value: number | undefined; onChange: (value: number) => void; name: string;
}) {
  return <fieldset className="choices">
    <legend>{question.prompt}</legend>
    {question.choices.map((choice, index) => <label className="choice" key={choice}>
      <input type="radio" name={name} checked={value === index} onChange={() => onChange(index)} />
      <span>{choice}</span>
    </label>)}
  </fieldset>;
}

function ChartBuilder({ chart, value, onChange }: {
  chart: Flowchart; value: number[]; onChange?: (value: number[]) => void;
}) {
  function slot(index: number, label: string) {
    const node = chart.nodes[value[index]];
    return <div className={`chart-slot ${node?.shape ?? 'empty'}${onChange ? ' editable' : ''}`}>
      <span className="chart-tile" aria-hidden={Boolean(onChange)}>{node?.text ?? 'Choose a tile'}</span>
      {onChange && <><ChevronRight className="tile-chevron" size={15} aria-hidden="true" />
      <label htmlFor={`tile-${index}`} className="sr-only">{label}</label>
      <select id={`tile-${index}`} value={value[index]} onChange={event => {
        const selected = Number(event.target.value);
        const updated = value.map((current, position) => position === index
          ? selected : current === selected ? value[index] : current);
        onChange(updated);
      }}>
        <option value={emptyChoice}>Choose a tile</option>
        {chart.nodes.map((item, option) => <option value={option} key={item.text}>{item.text}</option>)}
      </select></>}
    </div>;
  }

  function arrow(label?: string) {
    return <div className="chart-arrow">
      {label && <span>{label}</span>}<ArrowDown size={20} aria-hidden="true" />
    </div>;
  }

  return <div className="chart-work">
    {onChange && <p className="support-text">These tiles show one way to solve the problem. Place them between Start and End, then follow the arrows to check their order.</p>}
    <ul className="shape-key" aria-label="Tile shapes">
      <li><span className="shape-sample action" /> To do</li>
      <li><span className="shape-sample input" /> Take in or show</li>
      {chart.kind !== 'line' && <li><span className="shape-sample choice" /> Ask a question</li>}
    </ul>
    <div className={`chart-canvas chart-${chart.kind}`}>
      <div className="chart-node-cap">Start</div>
      {arrow()}
      {chart.kind === 'line' && chart.nodes.map((_, index) => <div className="chart-column" key={index}>
        {slot(index, `Step ${index + 1}`)}{arrow()}
      </div>)}
      {chart.kind === 'branch' && <>
        {slot(0, 'Before the split')}
        <div className="chart-fork" aria-hidden="true" />
        <div className="chart-branches">
          <div>{arrow(chart.branches?.[0])}{slot(1, 'Yes path')}{arrow()}</div>
          <div>{arrow(chart.branches?.[1])}{slot(2, 'No path')}{arrow()}</div>
        </div>
        <div className="chart-fork join" aria-hidden="true" />
      </>}
      {chart.kind === 'loop' && <>
        {slot(0, 'First step')}
        {arrow()}
        {slot(1, 'Question to repeat')}
        <div className="chart-fork" aria-hidden="true" />
        <div className="chart-branches">
          <div>{arrow(chart.branches?.[0])}{slot(2, 'Yes path')}
            <div className="chart-return"><CornerUpLeft size={17} aria-hidden="true" /> Back to the question</div>
          </div>
          <div>{arrow(chart.branches?.[1])}{slot(3, 'No path')}{arrow()}<div className="chart-node-cap">End</div></div>
        </div>
      </>}
      {chart.kind !== 'loop' && <div className="chart-node-cap">End</div>}
    </div>
  </div>;
}

function CodePractice({ starter, signedIn, signIn }: {
  starter: NonNullable<Lesson['code']>; signedIn: boolean; signIn: () => void;
}) {
  const [source, setSource] = useState(starter.source);
  const [input, setInput] = useState(starter.input);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const request = useRef<AbortController>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function run() {
    if (!supabase || !signedIn || request.current || !source.trim()) return;
    const active = new AbortController();
    request.current = active;
    setRunning(true);
    setOutput('');
    try {
      const { data, error } = await supabase.functions.invoke<{ output: string }>('compile', {
        body: { code: source, stdin: input },
        signal: active.signal,
      });
      if (active.signal.aborted) return;
      if (error instanceof FunctionsHttpError) {
        const details = await error.context.json().catch(() => null);
        setOutput(details?.error || 'The code runner could not start. Try again.');
      } else {
        setOutput(error ? 'The code runner could not connect. Try again.' : data?.output || '(No output)');
      }
    } catch {
      if (!active.signal.aborted) setOutput('The code runner could not connect. Try again.');
    } finally {
      if (!active.signal.aborted) setRunning(false);
      request.current = null;
    }
  }

  return <section className="practice" aria-labelledby="practice-title">
    <h3 id="practice-title">Try a small change</h3>
    <p>Change one value. Say what you expect to see, then run the program to check.</p>
    <label htmlFor="practice-source">C++ program</label>
    <textarea id="practice-source" className="code-editor" spellCheck={false} maxLength={12000}
      value={source} onChange={event => setSource(event.target.value)} />
    {starter.input !== '' && <label className="input-line" htmlFor="practice-input">Input
      <input id="practice-input" maxLength={1000} value={input} onChange={event => setInput(event.target.value)} />
    </label>}
    <div className="practice-actions">
      {signedIn
        ? <button className="button primary" type="button" disabled={running || !source.trim()} onClick={run}>
          <Play size={16} aria-hidden="true" /> {running ? 'Running…' : 'Run program'}
        </button>
        : <button className="button primary" type="button" onClick={signIn}>Sign in to run</button>}
      <button className="button quiet" type="button" disabled={running} onClick={() => {
        setSource(starter.source);
        setInput(starter.input);
        setOutput('');
      }}><RotateCcw size={16} aria-hidden="true" /> Reset</button>
    </div>
    {output && <pre className="program-output" aria-label="Program output" role="status">{output}</pre>}
  </section>;
}

export function LessonView({ lesson, number, mood, record, signedIn, save, next, back, signIn }: Props) {
  const stages = stagesFor(lesson);
  const [begun, setBegun] = useState(record.revision > 0);
  const [urdu, setUrdu] = useState(false);
  const [draft, setDraft] = useState(() => initialDraft(lesson, record.work));
  const [hint, setHint] = useState(() => {
    const current = stages[record.step];
    return current && record.firstTry[current] === false ? checkWork(lesson, current, record.work).hint : undefined;
  });
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ stage: Stage; text: string }>();
  const [review, setReview] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const submitLock = useRef(false);
  const focusAfterUpdate = useRef(false);
  const stage = stages[record.step];
  const finished = !stage;

  useEffect(() => {
    if (focusAfterUpdate.current) {
      stageHeading.current?.focus();
      focusAfterUpdate.current = false;
    }
  }, [begun, stage, success, review]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stage || submitLock.current) return;
    const result = checkWork(lesson, stage, draft);
    if (result.missing) {
      setNotice(result.missing);
      return;
    }
    setNotice('');
    if (result.hint && hint && JSON.stringify(record.work) === JSON.stringify(draft)) {
      setNotice('Change your answer using the hint, then try again.');
      return;
    }
    submitLock.current = true;
    setSaving(true);
    const passed = !result.hint;
    const saved = await save(lesson.id, record, {
      step: record.step + (passed ? 1 : 0),
      firstTry: { ...record.firstTry, [stage]: record.firstTry[stage] ?? passed },
      work: draft,
    });
    submitLock.current = false;
    setSaving(false);
    if (saved === 'error' || saved === 'conflict') {
      setNotice(saved === 'conflict' ? 'Your progress changed in another tab. Reopen this lesson and try again.' : 'Your work could not be saved. Check your connection and try again.');
      return;
    }
    setHint(result.hint);
    if (passed) {
      setSuccess({ stage, text: result.praise ?? '' });
      focusAfterUpdate.current = true;
    }
  }

  function update(change: Partial<Work>) {
    setDraft(value => ({ ...value, ...change }));
    setNotice('');
  }

  function renderStage(current: Stage): ReactNode {
    switch (current) {
      case 'ipo':
        return <div className="ipo-grid">
          {lesson.ipo.map((question, index) => <section key={question.prompt} className="ipo-part">
            <p className="eyebrow">{['Input', 'Processing', 'Output'][index]}</p>
            {urdu && <p className="urdu-prompt" lang="ur-Latn">{['Shuru mein kya chahiye?', 'Kya kaam karna hai?', 'Aakhir mein kya chahiye?'][index]}</p>}
            <ChoiceList question={question} name={`ipo-${index}`} value={draft.ipo?.[index]} onChange={value =>
              update({ ipo: (draft.ipo ?? []).map((choice, position) => position === index ? value : choice) })} />
          </section>)}
        </div>;
      case 'steps':
        return <>
          <label className="field" htmlFor="first-method"><span>Your first way</span>
            <small id="first-method-help">{requiredMethods} You can write in English or Roman Urdu.</small>
            <textarea id="first-method" aria-describedby="first-method-help" rows={4} maxLength={1200}
              value={draft.method ?? ''} onChange={event => update({ method: event.target.value })} />
          </label>
          <ChoiceList question={lesson.steps} name="steps" value={draft.stepAnswer} onChange={stepAnswer => update({ stepAnswer })} />
        </>;
      case 'chart':
        return <>
          <details className="submitted-work"><summary>See your steps</summary><p>{draft.method}</p></details>
          <ChartBuilder chart={lesson.chart} value={draft.chart ?? []} onChange={chart => update({ chart })} />
        </>;
      case 'compare':
        return <>
          <details className="submitted-work"><summary>See your first way</summary><p>{draft.method}</p></details>
          <label className="field" htmlFor="second-method"><span>Your second way</span>
            <small id="second-method-help">{lesson.alternate} Use one line for each step.</small>
            <textarea id="second-method" aria-describedby="second-method-help" rows={4} maxLength={1200}
              value={draft.alternate ?? ''} onChange={event => update({ alternate: event.target.value })} />
          </label>
          <label className="field" htmlFor="reason"><span>Which of your ways is better here, and why?</span>
            <small id="reason-help">Tell us which way you would use. Think about time, effort, or mistakes.</small>
            <textarea id="reason" aria-describedby="reason-help" rows={2} maxLength={600}
              value={draft.reason ?? ''} onChange={event => update({ reason: event.target.value })} />
          </label>
          <ChoiceList question={lesson.compare} name="compare" value={draft.comparison} onChange={comparison => update({ comparison })} />
        </>;
      case 'code':
        return <>
          <p className="support-text">Here is your plan as a short C++ program. Read it from top to bottom and predict what it will show.</p>
          <pre className="code-example"><code>{lesson.code!.source}</code></pre>
          <ChoiceList question={lesson.code!.question} name="prediction" value={draft.prediction} onChange={prediction => update({ prediction })} />
        </>;
    }
  }

  function recap() {
    return <div className="lesson-card">
      <div className="lesson-mark mint"><Check size={24} aria-hidden="true" /></div>
      <h2 tabIndex={-1} ref={stageHeading}>Lesson complete</h2>
      <p className="support-text">You earned {stages.length} of {stages.length} points.</p>
      <div className="feedback correct"><BookOpen size={20} aria-hidden="true" /><div><strong>What you just learned</strong><p>{lesson.takeaway}</p></div></div>
      {review && <div className="review-work">
        <h3>Your plan</h3>
        <dl>{lesson.ipo.map((question, index) => <div key={question.prompt}>
          <dt>{['Input', 'Processing', 'Output'][index]}</dt>
          <dd>{question.choices[record.work.ipo?.[index] ?? question.correct]}</dd>
        </div>)}</dl>
        <p><strong>First way</strong><br />{record.work.method}</p>
        <p><strong>Second way</strong><br />{record.work.alternate}</p>
        <p><strong>Your comparison</strong><br />{record.work.reason}</p>
        <h3>Your flowchart</h3>
        <ChartBuilder chart={lesson.chart} value={record.work.chart ?? []} />
      </div>}
      {lesson.code && <CodePractice starter={lesson.code} signedIn={signedIn} signIn={signIn} />}
      <div className="lesson-actions">
        <button className="button primary" onClick={next ?? back}>{next ? 'Next lesson' : 'Back to learning path'}<ArrowRight size={17} aria-hidden="true" /></button>
        <button className="button outline" aria-expanded={review} onClick={() => setReview(value => !value)}>{review ? 'Hide my work' : 'Review my work'}</button>
      </div>
    </div>;
  }

  return <div className="lesson-layout">
    <div className="lesson-main">
      <button className="button quiet back-button" onClick={back}><ArrowLeft size={17} aria-hidden="true" /> Learning path</button>
      <header className={`problem-card ${mood}`}>
        <div className="lesson-label"><span>Lesson {number}</span><ChevronRight size={14} aria-hidden="true" /><span>The problem</span></div>
        <h1>{lesson.title}</h1>
        <p>{lesson.story}</p>
        {urdu && <p lang="ur-Latn" className="urdu-story">{lesson.urdu}</p>}
        <button type="button" className="button outline" aria-expanded={urdu} onClick={() => setUrdu(value => !value)}>
          <Languages size={17} aria-hidden="true" /> {urdu ? 'Hide Roman Urdu' : 'Read in Roman Urdu'}
        </button>
      </header>
      {!begun && <div className="lesson-card intro-card">
        <div className="lesson-mark mint"><Lightbulb size={23} aria-hidden="true" /></div>
        <h2>How would you solve it?</h2>
        <p className="support-text">Think of what you have, what you would do, and what you want at the end.</p>
        <div className="lesson-actions"><button className="button primary" onClick={() => {
          focusAfterUpdate.current = true;
          setBegun(true);
        }}>Try the problem <ArrowRight size={17} aria-hidden="true" /></button></div>
      </div>}
      {begun && success && <div className="lesson-card">
        <div className="lesson-mark mint"><Check size={24} aria-hidden="true" /></div>
        <h2 tabIndex={-1} ref={stageHeading}>You got it</h2>
        <p>{success.text}</p>
        <div className="lesson-actions"><button className="button primary" onClick={() => {
          focusAfterUpdate.current = true;
          setSuccess(undefined);
        }}>{finished ? 'See what you learned' : 'Continue'} <ArrowRight size={17} aria-hidden="true" /></button></div>
      </div>}
      {begun && !success && finished && recap()}
      {begun && !success && stage && <section className="lesson-card">
        <div className="lesson-label"><span>Step {record.step + 1} of {stages.length}</span></div>
        <h2 tabIndex={-1} ref={stageHeading}>{stageNames[stage]}</h2>
        <form className="lesson-form" onSubmit={submit}>
          <fieldset className="stage-fields" disabled={saving}>
            {renderStage(stage)}
          </fieldset>
          {hint && <div className="feedback hint" role="status"><Lightbulb size={20} aria-hidden="true" /><div><strong>Try this hint</strong><p>{hint}</p></div></div>}
          {notice && <p className="form-error" role="alert">{notice}</p>}
          <div className="lesson-actions">
            <button className="button primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : hint ? 'Check again' : 'Check my work'} <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>}
    </div>
    <aside className="lesson-aside" aria-label="Lesson progress">
      <section className="side-card">
        <div className="side-title"><Route size={20} aria-hidden="true" /><h2>In this lesson</h2></div>
        <ol className="lesson-rail">
          {stages.map((item, index) => <li key={item} aria-current={index === record.step && begun ? 'step' : undefined}>
            <span className={`rail-number ${index < record.step ? 'done' : ''}`}>
              {index < record.step ? <Check size={15} aria-hidden="true" /> : index + 1}
            </span>
            <span>{stageNames[item]}</span>
          </li>)}
        </ol>
      </section>
      <section className="side-card lesson-help">
        <div className="side-title"><CircleHelp size={19} aria-hidden="true" /><h2>Take your time</h2></div>
        <p>A wrong answer gives you a hint. Try again to earn the same point.</p>
      </section>
    </aside>
  </div>;
}
