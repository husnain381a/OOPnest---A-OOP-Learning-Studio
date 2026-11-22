import { useId, useState } from 'react';
import { DndContext, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { ArrowRight, ArrowUpRight, MoveRight, Trash2 } from 'lucide-react';
import { shapes, type FlowAnswer, type Problem, type Shape } from './data';

function glyph(shape: Shape, className = '') {
  return <span className={`shape-glyph ${shape} ${className}`} aria-hidden="true" />;
}

function ShapeTool({ type, label, pressed, disabled, pick }: { type: Shape; label: string; pressed: boolean; disabled: boolean; pick: () => void }) {
  const { listeners, setNodeRef, transform } = useDraggable({ id: `shape:${type}`, data: { shape: type }, disabled });
  return <button ref={setNodeRef} type="button" className="tool tool-shape" disabled={disabled} aria-pressed={pressed} {...listeners}
    style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, position: 'relative', zIndex: 2 } : undefined}
    onClick={pick}>{glyph(type)}{label}</button>;
}

function FlowNode({ id, text, x, y, split, shape, chosen, disabled, onClick }: {
  id: string; text: string; x: number; y: number; split: boolean; shape?: Shape; chosen: boolean; disabled: boolean; onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return <button ref={setNodeRef} className={`flow-node ${shape ?? 'unassigned'} ${chosen || isOver ? 'chosen' : ''}`}
    style={{ left: `${x}%`, top: y, width: split ? '43%' : undefined }} type="button" disabled={disabled} data-node={id}
    aria-label={`${text}, ${shape ? shapes.find(item => item.type === shape)?.label : 'no shape'}`} onClick={onClick}>
    <span>{text}</span>
  </button>;
}

export function FlowBuilder({ lesson, value, onChange, disabled }: {
  lesson: Problem; value: FlowAnswer; onChange: (flow: FlowAnswer) => void; disabled: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Shape>();
  const [arrowMode, setArrowMode] = useState(false);
  const [from, setFrom] = useState('');
  const [branch, setBranch] = useState<'Yes' | 'No'>('Yes');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const cards = lesson.flow.cards;
  const layout = new Map<string, { x: number; y: number }>();
  let row = 0;
  for (const card of cards) {
    if (card.column !== 1) row++;
    layout.set(card.id, { x: card.column === -1 ? 25 : card.column === 1 ? 75 : 50, y: 44 + (row - 1) * 105 });
  }
  const height = row * 105 - 15;

  function place(cardId: string, shape: Shape) {
    if (!disabled && shapes.some(item => item.type === shape)) onChange({ ...value, shapes: { ...value.shapes, [cardId]: shape } });
  }

  function clickCard(cardId: string) {
    if (!arrowMode) { if (selected) place(cardId, selected); return; }
    if (!from || from === cardId) { setFrom(from ? '' : cardId); return; }
    const label = value.shapes[from] === 'decision' ? branch : undefined;
    if (!value.edges.some(edge => edge.from === from && edge.to === cardId && edge.label === label)) {
      onChange({ ...value, edges: [...value.edges, { from, to: cardId, label }] });
    }
    setFrom('');
  }

  return <DndContext id={`${id}-tools`} sensors={sensors} collisionDetection={pointerWithin} autoScroll={false}
    onDragEnd={({ active, over }) => { if (over) place(String(over.id), active.data.current?.shape as Shape); }}>
  <div className="flow-builder">
    <p className="muted">Pick a shape, then tap or drop it on a card. Pick Arrow to join two cards.</p>
    <div className="shape-tools" aria-label="Flowchart tools">
      {shapes.map(shape => <ShapeTool key={shape.type} type={shape.type} label={shape.label} disabled={disabled} pressed={!arrowMode && selected === shape.type}
        pick={() => { setSelected(shape.type); setArrowMode(false); setFrom(''); }} />)}
      <button type="button" className="tool" disabled={disabled} aria-pressed={arrowMode} onClick={() => { setArrowMode(!arrowMode); setFrom(''); }}><MoveRight size={19} />Arrow</button>
    </div>
    {arrowMode && <div className="arrow-guide" role="status">
      {from ? `From ${cards.find(card => card.id === from)?.text}. Pick the next card.` : 'Pick the card the arrow starts from.'}
      {from && value.shapes[from] === 'decision' && <label>Path <select aria-label="Decision path" value={branch} onChange={event => setBranch(event.target.value as 'Yes' | 'No')}><option>Yes</option><option>No</option></select></label>}
    </div>}
    <div className="flow-board" style={{ height }} aria-label="Flowchart canvas">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {value.edges.map((edge, index) => {
          const a = layout.get(edge.from); const b = layout.get(edge.to);
          if (!a || !b) return null;
          const down = a.y < b.y;
          const y1 = a.y + (down ? 37 : -37); const y2 = b.y + (down ? -39 : 39);
          const mid = (y1 + y2) / 2;
          if (a.y === b.y) return <path key={index} className="flow-line" d={`M ${a.x} ${a.y + 37} Q ${(a.x + b.x) / 2} ${a.y + 62}, ${b.x} ${b.y + 37}`} markerEnd={`url(#${id})`} />;
          return <path key={index} className="flow-line" d={`M ${a.x} ${y1} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${y2}`} markerEnd={`url(#${id})`} />;
        })}
      </svg>
      {value.edges.filter(edge => edge.label).map((edge, index) => {
        const a = layout.get(edge.from), b = layout.get(edge.to);
        return a && b && <span key={index} className="branch-label" style={{ left: `${(a.x + b.x) / 2}%`, top: (a.y + b.y) / 2 }}>{edge.label}</span>;
      })}
      {cards.map(card => {
        const placeAt = layout.get(card.id)!;
        return <FlowNode key={card.id} id={card.id} text={card.text} x={placeAt.x} y={placeAt.y} split={Boolean(card.column)}
          shape={value.shapes[card.id]} disabled={disabled} chosen={from === card.id} onClick={() => clickCard(card.id)} />;
      })}
    </div>
    {value.edges.length > 0 && <ul className="edge-list" aria-label="Arrows">
      {value.edges.map((edge, index) => <li key={`${edge.from}-${edge.to}-${edge.label}`}>
        <span>{cards.find(card => card.id === edge.from)?.text}</span><ArrowRight size={16} aria-hidden="true" />
        <span>{edge.label && <strong>{edge.label} · </strong>}{cards.find(card => card.id === edge.to)?.text}</span>
        <button type="button" className="icon-button" aria-label={`Remove arrow ${index + 1}`} disabled={disabled} onClick={() => onChange({ ...value, edges: value.edges.filter((_, position) => position !== index) })}><Trash2 size={16} /></button>
      </li>)}
    </ul>}
    <p className="small muted"><ArrowUpRight size={14} aria-hidden="true" /> Arrows show which card comes next.</p>
  </div></DndContext>;
}
