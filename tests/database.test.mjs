import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('Postgres persists authorized scores and gates lessons, tips, predictions and teacher reports', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, service_role;`);
    for (const name of ['202611120001_initial', '20261121000100_harden_workspace_access', '20261122113202_pfnest_curriculum_events']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'));
    }
    const blue = randomUUID(), gray = randomUUID(), teacher = randomUUID(), outsider = randomUUID();
    async function create(id, email, meta, claims = {}) {
      await db.query('insert into auth.users values ($1,$2,$3,$4,now())', [id, email, JSON.stringify(meta), JSON.stringify(claims)]);
    }
    await create(blue, 'blue.bscs-1@students.pfnest.example', { full_name: 'Sara', pfn_roll: 'BSCS-1', pfn_section: 'blue' });
    await create(gray, 'gray.bscs-1@students.pfnest.example', { full_name: 'Ali', pfn_roll: 'BSCS-1', pfn_section: 'gray' });
    await assert.rejects(create(teacher, 'aimenansari008@gmail.com', {}, {}), /provisioned separately/);
    await db.transaction(async tx => {
      await tx.query('insert into auth.users values ($1,$2,$3,$4,null)', [teacher, 'aimenansari008@gmail.com', '{"full_name":"Aimen"}', '{}']);
      await tx.query('update auth.users set raw_app_meta_data=$1, email_confirmed_at=now() where id=$2', ['{"pfn_teacher":true}', teacher]);
    });
    await assert.rejects(create(outsider, 'gray.bscs-2@students.pfnest.example', { full_name: 'Other', pfn_roll: 'BSCS-3', pfn_section: 'blue' }), /incomplete/);
    await create(outsider, 'legacy-admin@example.com', { full_name: 'Previous account' });
    await db.query("update public.profiles set role='admin' where id=$1", [outsider]);

    async function as(role, id = '') {
      await db.exec(`reset role; set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    }
    const save = (id, options = {}) => db.query(`select public.pfn_record(
      $1::uuid,$2::uuid,$3::text,$4::smallint,$5::text,$6::text,$7::boolean,$8::smallint,
      $9::text,'feedback',$10::jsonb,$11::text,$12::text,$13::boolean) as row`, [
      id, options.request ?? randomUUID(), options.lesson ?? 'chai', options.module ?? 1, options.stage ?? 'ipo', options.type ?? 'check',
      options.ok ?? true, options.award ?? 10, options.topic ?? options.stage ?? 'ipo', options.type === 'hint' ? '["First tip","Second tip","Third tip"]' : '[2,0,1]',
      options.previousLesson ?? null, options.previousStage ?? null, options.final ?? false,
    ]).then(response => response.rows[0].row);

    await as('authenticated', blue);
    await assert.rejects(save(blue), /permission denied/);
    await assert.rejects(db.query('select public.pfn_teacher_overview()'), /Teacher account required/);
    await as('service_role');
    await assert.rejects(save(blue, { lesson: 'lemon', previousLesson: 'chai' }), /previous lesson/);
    await assert.rejects(save(blue, { stage: 'steps', previousStage: 'ipo' }), /previous activity/);
    await assert.rejects(save(blue, { type: 'hint' }), /Try the activity/);
    assert.equal((await save(blue, { ok: false })).points, 0);
    for (const tip of ['First tip', 'Second tip', 'Third tip']) {
      const hint = await save(blue, { type: 'hint' });
      assert.equal(hint.points, -2);
      assert.equal(hint.message, tip);
    }
    await assert.rejects(save(blue, { type: 'hint' }), /three hints/);
    const request = randomUUID();
    const first = await save(blue, { request });
    assert.equal(first.points, 10);
    assert.deepEqual(await save(blue, { request }), first);
    await assert.rejects(save(blue), /already complete/);
    await save(gray);
    await save(blue, { stage: 'steps', previousStage: 'ipo', final: true });
    await save(blue, { lesson: 'hello', module: 3, stage: 'predict', ok: false, previousLesson: 'chai' });
    assert.equal((await save(blue, { lesson: 'hello', module: 3, stage: 'predict', award: 15, previousLesson: 'chai' })).points, 0);
    assert.equal((await save(gray, { lesson: 'hello', module: 3, stage: 'predict', award: 15 })).points, 15);
    await save(gray, { lesson: 'lock', stage: 'flow', ok: false, topic: 'flow-decision' });
    await save(blue, { lesson: 'lock', stage: 'flow', award: 20 });

    await as('authenticated', blue);
    assert.deepEqual((await db.query('select distinct user_id from public.pfn_events')).rows, [{ user_id: blue }]);
    assert.deepEqual((await db.query('select display_name from public.pfn_leaderboard()')).rows, [{ display_name: 'Sara' }]);
    await db.query('update public.pfn_settings set leaderboard_visible=false');
    assert.equal((await db.query('select leaderboard_visible from public.pfn_settings')).rows[0].leaderboard_visible, true);

    await as('authenticated', outsider);
    assert.equal((await db.query('select * from public.profiles where pfn_roll is not null')).rows.length, 0);
    await assert.rejects(db.query('select public.pfn_teacher_overview()'), /Teacher account required/);

    await as('authenticated', teacher);
    assert.equal((await db.query('select user_id from public.pfn_events')).rows.length, 0);
    const { report } = (await db.query('select public.pfn_teacher_overview() as report')).rows[0];
    assert.equal(report.students.length, 2);
    assert.equal(report.students.find(student => student.id === blue).score, 34);
    assert.equal(report.students.find(student => student.id === blue).completed, 1);
    const decision = report.weaknesses.filter(item => item.topic === 'flow-decision');
    assert.equal(decision.reduce((sum, item) => sum + item.students, 0), 1);
    assert.equal(decision.reduce((sum, item) => sum + item.attempted, 0), 2);
    await db.query('update public.pfn_settings set leaderboard_visible=false');
    await as('authenticated', blue);
    assert.deepEqual((await db.query('select * from public.pfn_leaderboard()')).rows, []);
  } finally { await db.close(); }
});
