import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ipoOrder, lessons } from '../supabase/functions/_shared/learning.ts';
import { answerFor } from './answers.mjs';

const executablePath = [process.env.PFNEST_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(path => path && existsSync(path));
assert.ok(executablePath, 'Set PFNEST_BROWSER to an installed Chrome, Edge or Chromium binary.');
const url = process.env.PFNEST_TEST_URL ?? 'http://127.0.0.1:5173/';
const screenshotDir = process.env.PFNEST_SCREENSHOTS;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true });

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  const screenshot = name => screenshotDir ? page.screenshot({ path: join(screenshotDir, `${name}.png`) }) : Promise.resolve();
  const hasNoOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const clickText = label => page.evaluate(label => {
    const target = Array.from(document.querySelectorAll('button')).find(button => !button.disabled && button.textContent.trim() === label);
    if (!target) throw Error(`Missing button ${label}`);
    target.click();
  }, label);

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.home-hero h1');
  assert.ok(await hasNoOverflow());
  await screenshot('desktop-path');
  await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await hasNoOverflow());
  await screenshot('phone-path');
  for (const route of ['signin', 'teacher-signin']) {
    await page.evaluate(route => { location.hash = route; }, route);
    await page.waitForFunction(route => document.querySelector('.auth-card h1')?.textContent === (route === 'signin' ? 'Student sign in' : 'Teacher sign in'), {}, route);
    assert.ok(await hasNoOverflow());
  }
  await page.evaluate(() => { location.hash = 'lesson/hello'; });
  await page.waitForSelector('.home-hero h1');
  assert.equal(await page.$('.program'), null, 'Direct links cannot unlock a later lesson.');
  await clickText('Try the first problem');
  await page.waitForSelector('.problem-box h1');
  assert.ok(await hasNoOverflow());
  await screenshot('phone-chai');
  assert.equal(await page.$eval('.activity-actions .secondary', button => button.disabled), true);
  await clickText('Check');
  await page.waitForSelector('.activity-panel .notice');
  assert.equal(await page.$('.next-action'), null);
  await page.click('.activity-actions .secondary');
  await page.waitForSelector('.feedback-points');
  assert.equal(await page.$eval('.feedback-points', item => item.textContent), '-2 points');

  for (const lesson of lessons) {
    await page.waitForFunction(id => location.hash === `#lesson/${id}` && Boolean(document.querySelector('.activity-actions')), {}, lesson.id);
    for (const stage of lesson.stages) {
      if (stage === 'flow' && lesson.id === 'chai') {
        await page.$eval('.shape-tools', item => item.scrollIntoView({ block: 'center' }));
        const handle = await (await page.$('.tool-shape')).boundingBox();
        const node = await (await page.$('[data-node="start"]')).boundingBox();
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await page.mouse.move(handle.x + handle.width / 2 + 12, handle.y + handle.height / 2);
        await page.waitForFunction(() => Boolean(document.querySelector('.tool-shape').style.transform));
        await page.mouse.move(node.x + node.width / 2, node.y + node.height / 2, { steps: 12 });
        await page.waitForFunction(() => document.querySelector('[data-node="start"]').classList.contains('chosen'));
        await page.mouse.up();
        await page.waitForFunction(() => document.querySelector('[data-node="start"]').classList.contains('start'));
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 80)));
      }
      await page.evaluate(async ({ stage, answer, lesson, ipoOrder }) => {
        const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
        const click = async element => { if (!element) throw Error(`Missing element in ${stage}`); element.click(); await frame(); };
        const setValue = (selector, value) => {
          const element = document.querySelector(selector);
          if (!element) throw Error(`Missing field ${selector}`);
          const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
          property.set.call(element, value);
          element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
        };
        if (stage === 'ipo') {
          for (const [position, group] of ipoOrder.entries()) {
            const text = lesson.ipo[group];
            const card = Array.from(document.querySelectorAll('.choice')).find(item => item.textContent.trim() === text);
            await click(card);
            await click(document.querySelectorAll('.ipo-drop')[answer[position]]);
          }
        }
        if (stage === 'steps') {
          for (const id of answer) {
            const row = document.querySelector(`[data-step="${id}"]`);
            while (Array.from(row.parentNode.children).indexOf(row) > id) await click(row.querySelector('.order-buttons button:first-child'));
          }
        }
        if (stage === 'write' || stage === 'pseudo') setValue('.activity-panel textarea', answer);
        if (stage === 'flow') {
          const toolLabels = { start: 'Start', end: 'End', io: 'Input / Output', process: 'Process', decision: 'Decision' };
          const tool = name => Array.from(document.querySelectorAll('.tool')).find(item => item.textContent.trim() === name);
          const node = name => document.querySelector(`[data-node="${name}"]`);
          for (const [card, shape] of Object.entries(answer.shapes)) {
            if (node(card).classList.contains(shape)) continue;
            await click(tool(toolLabels[shape])); await click(node(card));
            if (!node(card).classList.contains(shape)) throw Error(`Could not place the ${shape} shape on ${card}`);
          }
          await click(tool('Arrow'));
          for (const edge of answer.edges) {
            await click(node(edge.from));
            if (edge.label) { setValue('.arrow-guide select', edge.label); await frame(); }
            await click(node(edge.to));
          }
        }
        if (stage === 'compare' || stage === 'quiz') {
          await click(document.querySelectorAll('.radio-option input')[answer.choice]);
          setValue('.activity-panel input:not([type="radio"])', answer.reason);
          if (answer.second) setValue('.bonus-field textarea', answer.second);
        }
        if (stage === 'predict') {
          if (document.querySelector('.activity-actions .primary').textContent.trim() === 'Run') throw Error('Prediction must come first.');
          setValue('.activity-panel textarea', answer.text);
          if (answer.beep) await click(document.querySelector('.inline-check input'));
        }
        if (stage === 'code') setValue('.activity-panel textarea', answer);
        await frame();
      }, { stage, answer: answerFor(lesson, stage), lesson, ipoOrder });
      await clickText(stage === 'code' ? 'Run' : 'Check');
      try { await page.waitForSelector('.next-action', { timeout: 2500 }); }
      catch { throw Error(`${lesson.id}, ${stage}: ${await page.$eval('.activity-panel', item => item.innerText)}`); }
      assert.ok(await hasNoOverflow(), `Horizontal overflow in ${lesson.id} / ${stage}`);
      if (lesson.id === 'marks' && stage === 'pseudo') await screenshot('phone-marks');
      if (lesson.id === 'chai' && stage === 'compare') assert.equal(await page.$eval('.feedback-points', item => item.textContent), '+10 points');
      if (lesson.id === 'hello' && stage === 'code') {
        assert.equal(await page.$eval('.output pre', item => item.textContent), 'Salaam');
        await screenshot('phone-cout');
      }
      if (lesson.id === 'escape' && stage === 'code') assert.match(await page.$eval('.output', item => item.textContent), /Alert signal/);
      await page.click('.next-action');
    }
    await page.waitForSelector('.completion');
    await clickText('Continue');
    if (['chai', 'marks', 'hello'].includes(lesson.id)) console.log(`Verified end to end at 360px: ${lesson.title}`);
  }
  await page.waitForSelector('.stat-grid');
  assert.match(await page.$eval('.stat-grid', item => item.innerText), /993/);
  assert.equal((await page.$$('.badges .earned')).length, 3);
  assert.deepEqual(browserErrors, []);
  console.log('All 24 lessons completed at 360px. Desktop path and both phone sign-in screens checked.');
} finally { await browser.close(); }
