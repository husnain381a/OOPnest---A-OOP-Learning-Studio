import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simulateCout, programBottom, programTop } from '../supabase/functions/_shared/cout.ts';
import { currentActivity, grade, lessonReady, lessons, summarize } from '../supabase/functions/_shared/learning.ts';
import { answerFor, firstChai } from './answers.mjs';

test('every seeded lesson grades a valid answer at each checkpoint and unlocks the next lesson', () => {
  const rows = [];
  assert.equal(lessons.length, 24);
  for (const [index, lesson] of lessons.entries()) {
    assert.equal(lessonReady(lesson, rows), true);
    if (index + 1 < lessons.length) assert.equal(lessonReady(lessons[index + 1], rows), false);
    for (const stage of lesson.stages) {
      const answer = answerFor(lesson, stage);
      const result = grade(lesson, stage, answer, lesson.kind === 'problem' ? answerFor(lesson, 'write') : undefined);
      assert.equal(result.ok, true, `${lesson.id} / ${stage}: ${result.message}`);
      rows.push({ lesson_id: lesson.id, stage, type: 'check', ok: true, points: result.points, created_at: '2026-11-22T20:00:00Z' });
    }
    assert.equal(currentActivity(rows, lesson).done, true);
  }
  const stats = summarize(rows, new Date('2026-11-23T20:00:00Z'));
  assert.equal(stats.percent, 100);
  assert.equal(stats.streak, 1);
  assert.deepEqual(stats.badges, ['Step Master', 'Hisab Hero', 'First Coder']);
  assert.deepEqual(stats.scores, [420, 400, 175]);
});

test('a retry points out the missing branch, duplicates earn no bonus, and a wrong result earns no points', () => {
  const lock = lessons.find(lesson => lesson.id === 'lock');
  const chart = answerFor(lock, 'flow');
  const incomplete = { ...chart, edges: chart.edges.filter(edge => edge.label !== 'No') };
  assert.equal(grade(lock, 'flow', incomplete).topic, 'flow-decision');
  assert.equal(grade(lock, 'flow', incomplete).points, 0);
  const chai = lessons[0];
  assert.equal(grade(chai, 'compare', { ...answerFor(chai, 'compare'), second: firstChai }, firstChai).ok, false);
  const marks = lessons.find(lesson => lesson.id === 'marks');
  assert.equal(grade(marks, 'pseudo', answerFor(marks, 'pseudo').replace('225 and 75', '220 and 75')).points, 0);
});

test('cout supports its full visible wrapper, endl, chaining, tabs, escapes and beep notes', () => {
  const source = String.raw`cout << "Hello\n\t\"Lab\"\\" << "\a" << endl;`;
  const result = simulateCout([...programTop, source, ...programBottom].join('\n'));
  assert.equal(result.output, 'Hello\n\t"Lab"\\\n');
  assert.equal(result.beeps, 1);
  assert.match(simulateCout('cout << "Oops"').error, /;/);
  assert.match(simulateCout('cout << Oops;').error, /quotes/);
  assert.equal(simulateCout(String.raw`cout << "a\tb";`, 1).ok, false);
  assert.equal(simulateCout('cout << "Okay"; cin >> x;').ok, false);
});
