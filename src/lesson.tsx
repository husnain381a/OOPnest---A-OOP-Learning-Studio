import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, GripVertical, Lightbulb, Play, RotateCcw } from 'lucide-react';
import { currentActivity, ipoLabels, ipoOrder, jumble, programBottom, programTop, simulateCout, stageLabels,
  type Action, type Answer, type FlowAnswer, type Lesson, type Stage } from './data';
import { type EventRow } from './client';
import { FlowBuilder } from './flow';

type Props = { lesson: Lesson; rows: EventRow[]; onAction: (action: Action) => Promise<EventRow>; onNext: () => void; onBack: () => void };
const emptyFlow: FlowAnswer = { shapes: {}, edges: [] };
const moduleNames = ['Socho', 'Hisab', 'Pehla Code'];

function Program({ body, onChange, disabled }: { body: string; onChange?: (value: string) => void; disabled?: boolean }) {
  const bodyLines = body.split('\n');
  return <div className="program">
    {programTop.map((line, index) => <div className="code-line" key={line}><span aria-hidden="true">{index + 1}</span><code>{line}</code></div>)}
    <div className="code-line edit-line"><span aria-hidden="true">{bodyLines.map((_, index) => index + 4).join('\n')}</span>
      {onChange ? <textarea aria-label="C++ cout editor" autoCapitalize="off" autoComplete="off" spellCheck={false} rows={Math.max(2, bodyLines.length)}
        value={body} onChange={event => onChange(event.target.value)} disabled={disabled} maxLength={3000} /> : <code>{body}</code>}
    </div>
    {programBottom.map((line, index) => <div className="code-line" key={line}><span aria-hidden="true">{index + 4 + bodyLines.length}</span><code>{line}</code></div>)}
  </div>;
}

function Activities({ lesson, stage, answer, update, disabled }: {
  lesson: Lesson; stage: Stage; answer: Answer | undefined; update: (value: Answer) => void; disabled: boolean;
}) {
  const [picked, setPicked] = useState<number>();
  const prediction = useRef<HTMLTextAreaElement>(null);
  if (lesson.kind === 'problem' && stage === 'ipo') {
    const assignments = (answer as number[] | undefined) ?? [-1, -1, -1];
    const setAssignment = (card: number, group: number) => {
      if (card < 0 || card > 2 || disabled) return;
      const next = assignments.map(value => value === group ? -1 : value);
      next[card] = group;
      update(next); setPicked(undefined);
    };
    const choose = (card: number) => setPicked(picked === card ? undefined : card);
    return <><p className="muted">Pick a card, then choose where it belongs. You can also drag it.</p>
      <div className="ipo-options">{ipoOrder.map((card, index) => assignments[index] === -1 && <button key={card} type="button" disabled={disabled}
        className="choice" aria-pressed={picked === index} draggable={!disabled} onDragStart={event => event.dataTransfer.setData('text/plain', String(index))} onClick={() => choose(index)}>
        <GripVertical size={16} aria-hidden="true" /> {lesson.ipo[card]}</button>)}</div>
      <div className="ipo-groups">{ipoLabels.map((label, group) => {
        const index = assignments.indexOf(group);
        return <button key={label} type="button" className={`ipo-drop ${picked !== undefined ? 'ready' : ''}`} disabled={disabled}
          onDragOver={event => { if (!disabled) event.preventDefault(); }} onDrop={event => { event.preventDefault(); const value = event.dataTransfer.getData('text/plain'); if (/^[0-2]$/.test(value)) setAssignment(Number(value), group); }}
          onClick={() => { if (picked !== undefined) setAssignment(picked, group); else if (index !== -1) choose(index); }} aria-pressed={index !== -1 && picked === index}>
          <strong>{label}</strong><span>{index !== -1 ? lesson.ipo[ipoOrder[index]] : 'Place a card here'}</span>
        </button>;
      })}</div>
      {assignments.some(value => value !== -1) && <button className="text-button" type="button" onClick={() => { update([-1, -1, -1]); setPicked(undefined); }} disabled={disabled}><RotateCcw size={15} /> Clear cards</button>}
    </>;
  }

  if (lesson.kind === 'problem' && stage === 'steps') {
    const order = (answer as number[] | undefined) ?? jumble(lesson.steps.length);
    function move(from: number, to: number) {
      if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to || disabled) return;
      const next = [...order]; const [item] = next.splice(from, 1); next.splice(to, 0, item); update(next);
    }
    return <><p className="muted">Use the arrows or drag each step into place.</p>
      <ol className="sort-list">{order.map((id, position) => <li key={id} data-step={id} draggable={!disabled}
        onDragStart={event => event.dataTransfer.setData('text/plain', String(position))} onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain'); if (/^\d+$/.test(source)) move(Number(source), position); }}>
        <span className="step-number">{position + 1}</span><span>{lesson.steps[id]}</span>
        <div className="order-buttons"><button type="button" className="icon-button" onClick={() => move(position, position - 1)} disabled={disabled || position === 0} aria-label={`Move ${lesson.steps[id]} up`}><ArrowUp size={16} /></button>
          <button type="button" className="icon-button" onClick={() => move(position, position + 1)} disabled={disabled || position === order.length - 1} aria-label={`Move ${lesson.steps[id]} down`}><ArrowDown size={16} /></button></div>
      </li>)}</ol></>;
  }

  if (lesson.kind === 'problem' && (stage === 'write' || stage === 'pseudo')) return <label>
    <span className="field-help">{stage === 'write' ? 'Write 4 to 8 steps. Use your own words, one step per line.' : 'Pseudocode = steps ko simple numbered lines mein likhna. Use short English lines and put your final answer on the last line.'}</span>
    <textarea aria-label={stage === 'write' ? 'Your own steps' : 'Your pseudocode'} rows={6} maxLength={2000} disabled={disabled}
      placeholder={stage === 'pseudo' ? '1. …\n2. …\n3. …' : 'Write your first step here…'} value={typeof answer === 'string' ? answer : ''} onChange={event => update(event.target.value)} />
  </label>;

  if (lesson.kind === 'problem' && stage === 'flow') return <FlowBuilder lesson={lesson} value={(answer as FlowAnswer | undefined) ?? emptyFlow} onChange={update} disabled={disabled} />;

  if (lesson.kind !== 'code' && lesson.comparison && (stage === 'compare' || stage === 'quiz')) {
    const value = (answer as { choice: number; reason: string; second?: string } | undefined) ?? { choice: -1, reason: '', second: '' };
    return <>{stage === 'compare' && <label className="bonus-field">Try a second way <span className="small muted">Optional · 10 bonus points</span>
        <textarea rows={4} disabled={disabled} maxLength={2000} value={value.second ?? ''} placeholder="Write 4 to 8 steps for a different way." onChange={event => update({ ...value, second: event.target.value })} />
      </label>}
      <p className="activity-prompt">{lesson.comparison.situation}</p>
      <fieldset className="options"><legend className="sr-only">Choose a way</legend>{lesson.comparison.methods.map((method, index) => <label className="radio-option" key={method}>
        <input type="radio" name="solution" checked={value.choice === index} disabled={disabled} onChange={() => update({ ...value, choice: index })} />{method}</label>)}</fieldset>
      <label>Why is your choice better?<input value={value.reason} disabled={disabled} maxLength={180} onChange={event => update({ ...value, reason: event.target.value })} placeholder="Write one short reason." /></label>
    </>;
  }

  if (lesson.kind === 'code' && stage === 'predict') {
    const value = (answer as { text: string; beep: boolean } | undefined) ?? { text: '', beep: false };
    function addTab() {
      const field = prediction.current;
      if (!field) return;
      const start = field.selectionStart;
      update({ ...value, text: `${value.text.slice(0, start)}\t${value.text.slice(field.selectionEnd)}` });
      requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + 1, start + 1); });
    }
    return <><p className="muted">Type what you think the screen will show. Keep the same spaces and lines.</p>
      <Program body={lesson.sample} />
      <label>What’s the output?<textarea ref={prediction} className="monospace" spellCheck={false} autoCapitalize="off" maxLength={500} rows={3} disabled={disabled} value={value.text} onChange={event => update({ ...value, text: event.target.value })} /></label>
      {[3, 5].includes(lesson.lesson) && <button type="button" className="button subtle" disabled={disabled} onClick={addTab}>Insert a tab</button>}
      {lesson.lesson === 4 && <label className="inline-check"><input type="checkbox" checked={value.beep} disabled={disabled} onChange={event => update({ ...value, beep: event.target.checked })} /> An alert will happen</label>}
    </>;
  }

  if (lesson.kind === 'code' && stage === 'code') return <>
    <p>{lesson.detail}</p><p className="activity-prompt">{lesson.task}</p>
    <Program body={typeof answer === 'string' ? answer : lesson.starter} onChange={update} disabled={disabled} />
    <details className="program-help"><summary>What are the other lines?</summary>
      <p><code>#include</code> · Text dikhane ka tool ready karta hai.</p><p><code>using namespace std</code> · Is se sirf cout likh sakti ho.</p>
      <p><code>main</code> · Program yahan se shuru hota hai.</p><p><code>return 0</code> · Program theek se khatam hua.</p>
      <p className="muted">Abhi pattern yaad kar lo, samajh baad mein aayegi.</p>
    </details>
    <p className="small muted">C++ output simulator</p>
  </>;
  return null;
}

function Activity({ lesson, stage, index, rows, onAction, onContinue }: {
  lesson: Lesson; stage: Stage; index: number; rows: EventRow[]; onAction: Props['onAction']; onContinue: () => void;
}) {
  const prior = rows.filter(row => row.lesson_id === lesson.id && row.stage === stage);
  const passed = prior.find(row => row.ok);
  const [answer, setAnswer] = useState<Answer | undefined>(passed?.answer);
  const [feedback, setFeedback] = useState<EventRow | undefined>(passed ?? prior.at(-1));
  const [output, setOutput] = useState<ReturnType<typeof simulateCout>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<Action | null>(null);
  const hints = rows.filter(row => row.lesson_id === lesson.id && row.type === 'hint').length;
  const attempted = prior.some(row => row.type === 'check');
  const stageTitle = stageLabels[stage];

  function update(value: Answer) { setAnswer(value); setError(''); }

  async function submit(type: Action['type']) {
    if (busy || passed) return;
    let value = answer;
    if (lesson.kind === 'problem' && stage === 'steps' && !value) value = jumble(lesson.steps.length);
    if (lesson.kind === 'code' && stage === 'code' && type === 'check') {
      const source = typeof value === 'string' ? value : lesson.starter;
      value = source;
      setOutput(simulateCout(source, lesson.lesson));
    }
    const same = pending.current?.type === type && JSON.stringify(pending.current.answer) === JSON.stringify(value);
    const action: Action = same && pending.current ? pending.current : { id: crypto.randomUUID(), lessonId: lesson.id, stage, type, answer: value };
    pending.current = action;
    setBusy(true); setError('');
    try { const response = await onAction(action); setFeedback(response); pending.current = null; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  }

  return <section className="activity-panel" aria-labelledby="activity-title">
    <div className="activity-heading"><span className="eyebrow">Activity {index + 1} of {lesson.stages.length}</span><h2 id="activity-title">{stageTitle}</h2></div>
    <Activities lesson={lesson} stage={stage} answer={answer} update={update} disabled={busy || Boolean(passed)} />
    {!passed && <div className="activity-actions">
      <button type="button" className="button secondary" onClick={() => void submit('hint')} disabled={!attempted || hints >= 3 || busy}><Lightbulb size={18} /> Hint <span className="small">{hints}/3</span></button>
      <button type="button" className="button primary" onClick={() => void submit('check')} disabled={busy}>{stage === 'code' && <Play size={17} />}{busy ? 'Saving…' : stage === 'code' ? 'Run' : 'Check'}</button>
    </div>}
    {output?.ok && <section className="output" aria-label="Simulator output"><strong>Output</strong><pre>{output.output || ' '}</pre>
      {output.beeps > 0 && <p className="small">Alert signal (beep) × {output.beeps}</p>}</section>}
    {error && <p role="alert" className="notice error">{error}</p>}
    {feedback && <div className={`notice ${feedback.ok ? 'success' : ''}`} role="status">
      {feedback.ok ? <CheckCircle2 size={20} /> : <Lightbulb size={19} />}<span>{feedback.message}{feedback.points !== 0 && <strong className="feedback-points">{feedback.points > 0 ? '+' : ''}{feedback.points} points</strong>}</span>
    </div>}
    {passed && lesson.id === 'marks' && stage === 'steps' && <p className="concept-note">Algorithm = kisi problem ko hal karne ke clear steps.</p>}
    {passed && lesson.kind === 'code' && stage === 'predict' && <p className="concept-note">{lesson.detail}</p>}
    {passed && <button type="button" className="button primary next-action" onClick={onContinue}>Next <ArrowRight size={18} /></button>}
  </section>;
}

export function LessonPage({ lesson, rows, onAction, onNext, onBack }: Props) {
  const progress = currentActivity(rows, lesson);
  const [index, setIndex] = useState(progress.done ? lesson.stages.length : progress.index);
  const top = useRef<HTMLHeadingElement>(null);
  const stage = lesson.stages[index];

  useEffect(() => { top.current?.focus({ preventScroll: true }); }, [lesson.id]);

  function advance() {
    setIndex(index + 1);
    window.scrollTo(0, 0);
    top.current?.focus({ preventScroll: true });
  }

  return <main className="lesson-main" id="main">
    <button type="button" className="text-button" onClick={onBack}><ArrowLeft size={18} /> Learning path</button>
    <div className="lesson-progress"><span>{moduleNames[lesson.module - 1]}</span><span>{progress.passed.size} of {lesson.stages.length} activities</span>
      <progress value={progress.passed.size} max={lesson.stages.length} aria-label="Lesson activity progress" /></div>
    <section className="problem-box">
      <span className="eyebrow">{lesson.kind === 'quiz' ? 'Module quiz' : 'The problem'}</span>
      <h1 tabIndex={-1} ref={top}>{lesson.title}</h1><p>{lesson.story}</p>
    </section>
    {stage ? <Activity key={stage} lesson={lesson} stage={stage} index={index} rows={rows} onAction={onAction} onContinue={advance} /> : <section className="activity-panel completion">
      <span className="icon-tile"><Check size={27} /></span><h2>Lesson complete</h2><p className="muted">Shabash! Agla lesson ready hai.</p>
      <button type="button" className="button primary" onClick={onNext}>Continue <ArrowRight size={18} /></button>
    </section>}
  </main>;
}
