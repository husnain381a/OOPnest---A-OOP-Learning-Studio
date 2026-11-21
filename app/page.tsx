'use client';
import {useEffect,useState,useRef} from 'react';
import {ArrowUpRight,ArrowRight,BookOpen,Code2,Compass,LayoutDashboard,GraduationCap,Search,ChevronRight,Check,CheckCircle2,Play,Clock,NotebookPen,Bookmark,Trophy,Globe2,Coffee,Wallet,Bike,Car,CreditCard,IdCard,ShoppingBag,Pizza,Lightbulb,ArrowLeft,RotateCcw,Copy,Terminal,Menu,X,LogOut,Shield,ExternalLink,Layers,Sparkles,Download} from 'lucide-react';
import {lessons,resources,type Lesson} from '../lib/content';
import {supabase} from '../lib/supabase';
import {FunctionsHttpError} from '@supabase/supabase-js';
import {readLocal,readLocalJson,useWorkspace,writeLocal} from '../lib/use-workspace';
import {StudentDirectory} from './student-directory';
import {AuthScreen} from './auth-screen';
type View='Dashboard'|'Learning path'|'Real-world examples'|'Playground'|'Resources'|'My notes'|'My progress'|'Admin workspace'|'Lesson';
const navs=[{name:'Dashboard',icon:LayoutDashboard},{name:'Learning path',icon:Compass},{name:'Real-world examples',icon:Layers},{name:'Playground',icon:Code2},{name:'Resources',icon:BookOpen},{name:'My notes',icon:NotebookPen}] as const;
const iconMap={coffee:Coffee,wallet:Wallet,bike:Bike,car:Car,card:CreditCard,id:IdCard,bag:ShoppingBag,pizza:Pizza};
function TopicIcon({lesson,size=26}:{lesson:Lesson;size?:number}){const I=iconMap[lesson.icon as keyof typeof iconMap];return <I size={size} strokeWidth={1.7}/>}
function Art(){return <div className="hero-art" aria-hidden="true"><span className="art-star star-one">✳</span><span className="art-star star-two">✦</span><div className="recipe"><span className="recipe-title"><Code2 size={15}/> chai.cpp</span><code><span>class</span> Chai {'{'}<br/> <span>public:</span><br/>  int sugar = <b>2</b>;<br/>  void serve();<br/>{'};'}</code></div><div className="art-arrow">↝</div><div className="cup"><div className="steam s1"/><div className="steam s2"/><div className="tea"/><div className="cup-face"><i/><i/><b/></div><div className="handle"/></div><div className="saucer"/><div className="art-label"><span/> A little chai. A lot of OOP.</div><div className="floating-tag"><span>{'{ }'}</span> Objects, meet real life.</div></div>}
export default function Home(){
 const workspace=useWorkspace();
 if(!workspace.user)return <AuthScreen checkingSession={!workspace.identity}/>;
 return <LearningWorkspace key={workspace.user.id} workspace={workspace}/>;
}

function LearningWorkspace({workspace}:{workspace:ReturnType<typeof useWorkspace>}){
 const [view,setView]=useState<View>('Dashboard'),[selected,setSelected]=useState(lessons[0]),[language,setLanguage]=useState('English'),[query,setQuery]=useState(''),[filter,setFilter]=useState('All concepts'),[saved,setSaved]=useState<string[]>([]),[code,setCode]=useState(lessons[0].code),[stdin,setStdin]=useState(''),[output,setOutput]=useState(''),[running,setRunning]=useState(false),[toast,setToast]=useState(''),[mobile,setMobile]=useState(false),[answer,setAnswer]=useState<number|null>(null),[resourceFilter,setResourceFilter]=useState('All languages');
 const [completing,setCompleting]=useState(false);
 const {user,isAdmin,completed,notes,status}=workspace;
 const toastTimer=useRef<number|undefined>(undefined);
 const runRequest=useRef<AbortController|undefined>(undefined);

 function notify(message:string){
  window.clearTimeout(toastTimer.current);
  setToast(message);
  toastTimer.current=window.setTimeout(()=>setToast(''),4000);
 }

 function clearOutput(){
  runRequest.current?.abort();
  runRequest.current=undefined;
  setRunning(false);
  setOutput('');
 }

 const navigate=(v:View,lesson?:Lesson)=>{
  if(view==='Playground'&&v!=='Playground')clearOutput();
  setView(v);
  setQuery('');
  setMobile(false);
  window.scrollTo({top:0,behavior:'smooth'});
  window.history.replaceState(null,'','#'+encodeURIComponent(v)+(lesson?'/'+lesson.id:''));
 };
 const openLesson=(l:Lesson)=>{setSelected(l);setAnswer(null);navigate('Lesson',l)};
 const openCode=(l:Lesson)=>{
  if(view==='Playground'&&l.id===selected.id){setMobile(false);return}
  clearOutput();
  setSelected(l);
  setCode(readLocal('oopnest-code-'+l.id)??l.code);
  setStdin('');
  navigate('Playground',l);
 };

 useEffect(()=>{
  const bookmarks=readLocalJson('oopnest-saved');
  if(Array.isArray(bookmarks))setSaved(bookmarks.filter(item=>typeof item==='string'));
  const preferredLanguage=readLocal('oopnest-language');
  if(preferredLanguage==='Roman Urdu'||preferredLanguage==='Hindi')setLanguage(preferredLanguage);

  const views:View[]=[...navs.map(n=>n.name),'My progress','Admin workspace','Lesson'];
  const [viewHash,lessonId]=window.location.hash.slice(1).split('/');
  const destination=views.find(name=>viewHash===encodeURIComponent(name));
  const lesson=lessons.find(item=>item.id===lessonId)??lessons[0];
  if(destination)setView(destination);
  if(destination==='Lesson'||destination==='Playground')setSelected(lesson);
  if(destination==='Playground')setCode(readLocal('oopnest-code-'+lesson.id)??lesson.code);

  return ()=>{
   window.clearTimeout(toastTimer.current);
   runRequest.current?.abort();
  };
 },[]);

 function toggleSave(id:string){
  const nextSaved=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];
  if(writeLocal('oopnest-saved',JSON.stringify(nextSaved)))setSaved(nextSaved);
  else notify('Could not save the bookmark on this device.');
 }

 async function complete(){
  if(answer!==selected.correct||completing)return;
  setCompleting(true);
  try{
   const saved=await workspace.completeLesson(selected.id);
   notify(saved?'Lesson completed. One concept closer!':'Could not save progress. Please try again.');
  }catch{notify('Could not save progress. Please try again.')}
  finally{setCompleting(false)}
 }

 async function saveNote(body:string){
  try{
   if(!await workspace.saveNote(selected.id,body))throw new Error('Note could not be saved');
   notify('Note saved to your account');
  }catch{notify('Could not save your note. Please try again.')}
 }

 function editCode(value:string){
  setCode(value);
  if(!writeLocal('oopnest-code-'+selected.id,value))notify('Could not save your code on this device.');
 }

 async function run(){
  if(!supabase){setOutput('Live execution requires a Supabase connection.');return}
  if(runRequest.current)return;
  const request=new AbortController();
  runRequest.current=request;
  setRunning(true);
  setOutput('');
  try{
   const {data,error}=await supabase.functions.invoke<{output:string}>('compile',{body:{code,stdin},signal:request.signal});
   if(error instanceof FunctionsHttpError){
    const details=await error.context.json().catch(()=>null);
    if(details?.error)throw new Error(details.error);
    if(error.context.status===401)throw new Error('Your session expired. Sign in again to run code.');
   }
   if(error||!data)throw new Error('Could not reach the compiler. Please try again.');
   if(!request.signal.aborted)setOutput(data.output||'(Program finished without output)');
  }catch(error){
   if(!request.signal.aborted)setOutput((error as Error).message);
  }finally{
   if(runRequest.current===request){runRequest.current=undefined;setRunning(false)}
  }
 }

 async function signOut(){
  try{
   const {error}=await supabase.auth.signOut({scope:'local'});
   if(error)throw error;
   window.history.replaceState(null,'','#Dashboard');
  }catch{notify('Could not sign out. Please try again.')}
 }
 const next=lessons.find(l=>!completed.includes(l.id))||lessons[0];
 const matching=lessons.filter(l=>(l.title+' '+l.world+' '+l.description).toLowerCase().includes(query.toLowerCase())&&(filter!=='Saved examples'||saved.includes(l.id)));
 const heading=view==='Lesson'?selected.title:view;
 return <div className="app-shell"><a href="#main" className="skip-link">Skip to content</a><aside className={'sidebar '+(mobile?'is-open':'')}><a href="#Dashboard" onClick={e=>{e.preventDefault();navigate('Dashboard')}} className="brand"><span className="brand-mark"><Code2 size={25}/></span>oopnest<span className="brand-dot">.</span></a><div className="workspace-tag"><span className="cpp-mini">C++</span><div>Your learning space<small>From curious to confident</small></div></div><p className="nav-label">LET’S LEARN</p><nav>{navs.map(n=><button key={n.name} aria-current={view===n.name?"page":undefined} className={'nav-item '+(view===n.name||(view==='Lesson'&&n.name==='Learning path')?'active':'')} onClick={()=>n.name==='Playground'?openCode(selected):navigate(n.name)}><n.icon size={19}/>{n.name}{n.name==='Playground'&&<span className="new-pill">TRY IT</span>}</button>)}</nav><div className="side-divider"/><button className={'nav-item '+(view==='My progress'?'active':'')} onClick={()=>navigate('My progress')}><Trophy size={19}/>My progress</button><div className="sidebar-bottom"><div className="side-tip"><span className="tip-icon"><Lightbulb size={21}/></span><strong>A little every day.</strong><p>One concept. One example.<br/>You’ve got this.</p><button onClick={()=>openLesson(next)}>Take a small step <ArrowUpRight size={16}/></button></div><button className="nav-item admin-link" onClick={()=>navigate('Admin workspace')}><Shield size={17}/>Admin workspace<ArrowUpRight size={14}/></button><div className="side-foot">Made for your “aha!” moments.</div></div></aside>{mobile&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
 <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-btn" aria-label="Open menu" aria-expanded={mobile} onClick={()=>setMobile(true)}><Menu size={22}/></button><span>My workspace</span><ChevronRight size={14}/><strong>{heading}</strong></div><div className="top-actions"><label className="language-select"><Globe2 size={16}/><select aria-label="Explanation language" value={language} onChange={e=>{setLanguage(e.target.value);if(!writeLocal('oopnest-language',e.target.value))notify('Could not save your language on this device.')}}><option>English</option><option>Roman Urdu</option><option>Hindi</option></select></label><div className="top-rule"/><button className="user-button" aria-label="Sign out" onClick={signOut} title="Sign out"><span className="avatar">{user.email?.[0]?.toUpperCase()||'L'}</span><span>Sign out</span><LogOut size={14}/></button></div></header>
 <main id="main"><div className="intro-row"><div><p className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><h1>{view==='Dashboard'?<>Hello, curious mind <span className="wave">✳</span></>:heading}</h1><p className="page-subtitle">{view==='Dashboard'?'Let’s make object-oriented programming feel a little more human.':view==='Playground'?'Think it. Tweak it. Turn an everyday idea into C++.':view==='Resources'?'Learn in a language that feels like home.':view==='Lesson'?selected.concept:'Small steps. Real examples. A clearer understanding.'}</p></div>{view==='Dashboard'&&<span className="friendly-pill"><span className="green-dot"/>Your journey starts here</span>}</div>
 {status!=='ready'&&<div className="notes-banner" role="status">
  <p>{status==='loading'?'Loading your workspace…':'Could not load your account data.'}</p>
  {status==='error'&&<button className="text-button" onClick={workspace.retry}>Try again</button>}
 </div>}
 {view==='Dashboard'&&<><section className="hero"><div className="hero-copy"><span className="hero-eyebrow"><span/> OOP, WITHOUT THE OVERWHELM</span><h2>Big concepts.<br/><em>Everyday examples.</em></h2><p>From your morning chai to your next ride home.<br className="desktop-br"/> Learn C++ through the world you already know.</p><div className="hero-actions"><button className="button primary" onClick={()=>openLesson(next)}>{completed.length?'Continue learning':'Start your journey'}<ArrowRight size={17}/></button><button className="text-button" onClick={()=>navigate('Real-world examples')}>Explore examples<ArrowUpRight size={17}/></button></div><div className="hero-caption"><span className="mini-check"><Check size={11}/></span>Beginner friendly<span className="dot-sep">·</span>Learn at your pace<span className="dot-sep">·</span>Built around real life</div></div><Art/></section>
 <section className="stats-grid" aria-label="Your learning overview"><div className="stat"><span className="stat-icon mint"><Compass size={21}/></span><div><strong>{completed.length} <small>/ 8</small></strong><p>Concepts explored</p></div><div className="stat-decoration"><ArrowUpRight size={19}/></div></div><div className="stat"><span className="stat-icon peach"><Layers size={21}/></span><div><strong>8</strong><p>Everyday stories to discover</p></div></div><div className="stat"><span className="stat-icon lavender"><Code2 size={21}/></span><div><strong>{completed.length*20} <small>XP</small></strong><p>Earned from quick checks</p></div><span className="small-tag">Let’s grow</span></div></section>
 <div className="dashboard-columns"><section className="learning-panel"><div className="section-heading"><div><p className="eyebrow">YOUR NEXT SMALL STEP</p><h2>{completed.length?'Keep the momentum going':'First, meet the building blocks'}</h2></div><button className="text-button" onClick={()=>navigate('Learning path')}>View learning path<ArrowRight size={16}/></button></div><button className="continue-card" onClick={()=>openLesson(next)}><div className={'lesson-art '+next.color}><TopicIcon lesson={next} size={53}/><span className="tiny-spark">✦</span><span className="art-curly">{'{ }'}</span></div><div className="continue-copy"><span className="lesson-label">LESSON {lessons.indexOf(next)+1} <span>·</span> THE FOUNDATIONS</span><h3>{next.title}</h3><p>{next.description}</p><div className="lesson-meta"><span><Clock size={14}/>{next.minutes} min</span><span><BookOpen size={14}/>Story + code + quick check</span></div><span className="continue-link">{completed.includes(next.id)?'Revisit lesson':'Let’s learn this'}<ArrowRight size={16}/></span></div><ChevronRight className="continue-chevron" size={20}/></button><div className="path-progress"><span>Your OOP foundations</span><span>{completed.length} of 8 complete</span><div className="progress-track"><div style={{width:completed.length/8*100+'%'}}/></div></div></section><aside className="daily-card"><div className="daily-top"><span className="round-icon"><Lightbulb size={20}/></span><span>THE EVERYDAY CONNECTION</span></div><h3>Your phone is an<br/>OOP lesson. Really.</h3><p>You tap a button to take a photo. The complicated stuff stays hidden.<br/>That’s <strong>abstraction</strong> in action.</p><button onClick={()=>openLesson(lessons[5])}>Meet abstraction<ArrowUpRight size={17}/></button><span className="daily-spark" aria-hidden="true">✳</span></aside></div>
 <section className="examples-section"><div className="section-heading"><div><h2>Less textbook. More real life.</h2><p>Familiar things. Powerful programming ideas.</p></div><button className="text-button" onClick={()=>navigate('Real-world examples')}>All examples<ArrowRight size={16}/></button></div><div className="example-grid">{[lessons[0],lessons[2],lessons[3]].map(l=><Example key={l.id} l={l} saved={saved.includes(l.id)} toggle={()=>toggleSave(l.id)} open={()=>openLesson(l)}/>)}</div></section><div className="bottom-banner"><div><span className="banner-icon"><Code2 size={24}/></span><div><strong>Learning clicks when you try it.</strong><p>Your very first C++ experiment is one click away.</p></div></div><button className="button secondary" onClick={()=>openCode(next)}>Open playground<ArrowUpRight size={16}/></button></div></>}
 {(view==='Learning path'||view==='Real-world examples')&&<><div className="collection-toolbar"><label className="search-field"><Search size={18}/><input placeholder="Search concepts or everyday stories…" aria-label="Search lessons" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filter-group">{['All concepts','Saved examples'].map(f=><button className={filter===f?'selected':''} key={f} onClick={()=>setFilter(f)}>{f==='Saved examples'&&<Bookmark size={14}/>} {f}</button>)}</div></div>{view==='Learning path'&&<div className="path-summary"><Compass size={30}/><div><h3>Your OOP foundations</h3><p>8 connected lessons · 111 minutes of guided learning · All lessons unlocked</p></div><span>{completed.length}/8 complete</span></div>}<div className="full-example-grid">{matching.map((l,i)=>view==='Real-world examples'?<Example key={l.id} l={l} saved={saved.includes(l.id)} toggle={()=>toggleSave(l.id)} open={()=>openLesson(l)}/>:<button className="path-card" key={l.id} onClick={()=>openLesson(l)}><span className={'path-number '+l.color}>{completed.includes(l.id)?<Check size={25}/>:String(lessons.indexOf(l)+1).padStart(2,'0')}</span><div><span className="lesson-label">{l.minutes} MIN · {completed.includes(l.id)?'COMPLETED':'BEGINNER'}</span><h3>{l.title}</h3><p>{l.concept}</p><span className="world-link"><TopicIcon lesson={l} size={16}/>{l.world}</span></div><ArrowUpRight size={20}/></button>)}</div>{!matching.length&&<div className="empty-state"><Search size={32}/><h3>No examples found</h3><p>{filter==='Saved examples'?'Save an example using its bookmark button to find it here.':'Try searching for chai, wallet, or inheritance.'}</p></div>}</>}
 {view==='Lesson'&&<div className="lesson-layout"><article className="lesson-article"><button className="text-button back-link" onClick={()=>navigate('Learning path')}><ArrowLeft size={16}/>Back to learning path</button><div className={'story-cover '+selected.color}><TopicIcon lesson={selected} size={70}/><div><span className="lesson-label">LET’S START WITH SOMETHING FAMILIAR</span><h2>{selected.world}</h2></div></div><span className="content-kicker">01 / SEE IT IN REAL LIFE</span><h2>{selected.concept}</h2><p className="analogy" lang={language==='Hindi'?'hi':'en'}>{language==='Roman Urdu'?selected.urdu:language==='Hindi'?selected.hindi:selected.analogy}</p><span className="content-kicker">02 / CONNECT THE DOTS</span><h2>From everyday life to C++</h2><div className="mapping-table"><div className="mapping-head"><span>IN YOUR WORLD</span><span>IN YOUR CODE</span></div>{selected.mapping.map(([a,b])=><div key={a}><span>{a}</span><code>{b}</code></div>)}</div><span className="content-kicker">03 / MAKE IT REAL</span><div className="section-heading"><h2>The whole idea, in code.</h2><button className="text-button" onClick={()=>openCode(selected)}>Try in playground<ArrowUpRight size={16}/></button></div><CodeBlock code={selected.code}/><div className="expected"><Terminal size={17}/><div><strong>Expected output</strong><pre>{selected.output}</pre></div></div><span className="content-kicker">04 / YOUR AHA! MOMENT</span><h2>Quick check</h2><p>{selected.question}</p><div className="answers">{selected.answers.map((a,i)=><button key={a} onClick={()=>setAnswer(i)} className={answer===i?(i===selected.correct?'correct':'incorrect'):''}><span>{String.fromCharCode(65+i)}</span>{a}{answer===i&&(i===selected.correct?<CheckCircle2 size={19}/>:<X size={19}/>)}</button>)}</div>{answer!==null&&<p className={'quiz-feedback '+(answer===selected.correct?'success':'')}>{answer===selected.correct?'You’ve got it! ':'Not quite. '}{selected.explanation}</p>}<button className="button primary" onClick={complete} disabled={status!=='ready'||completing||answer!==selected.correct||completed.includes(selected.id)}><Check size={17}/>{completed.includes(selected.id)?'Lesson completed':completing?'Saving progress…':'Complete lesson · earn 20 XP'}</button><div className="challenge"><Sparkles size={23}/><div><h3>Make it your own</h3><p>{selected.challenge}</p><button className="text-button" onClick={()=>openCode(selected)}>Take it to the playground<ArrowRight size={15}/></button></div></div>{lessons.indexOf(selected)<7&&<button className="button secondary" onClick={()=>openLesson(lessons[lessons.indexOf(selected)+1])}>Next: {lessons[lessons.indexOf(selected)+1].title}<ArrowRight size={17}/></button>}</article><aside className="lesson-aside"><div className="aside-box"><span className="eyebrow">IN THIS LESSON</span><h3>{selected.title}</h3><p><Clock size={15}/>{selected.minutes} minutes · Beginner</p><ol><li>See it in real life</li><li>Connect the dots</li><li>Make it real</li><li>Quick check</li></ol><button className="button secondary" onClick={()=>toggleSave(selected.id)}><Bookmark size={16} fill={saved.includes(selected.id)?'currentColor':'none'}/>{saved.includes(selected.id)?'Saved to your examples':'Save this example'}</button></div><NoteEditor key={selected.id+'-'+user.id} value={notes[selected.id]??''} onSave={saveNote} disabled={status!=='ready'}/><div className="aside-language"><Globe2 size={21}/><p>Need a familiar voice? Switch explanations to <strong>Roman Urdu or Hindi</strong> in the top bar.</p></div></aside></div>}
 {view==='Playground'&&<><div className="playground-toolbar"><label>Everyday example<select value={selected.id} onChange={e=>openCode(lessons.find(l=>l.id===e.target.value)!)}>{lessons.map(l=><option key={l.id} value={l.id}>{l.title} — {l.world}</option>)}</select></label><button className="text-button" onClick={()=>openLesson(selected)}><BookOpen size={17}/>Read the lesson</button></div><div className="playground-grid"><section className="editor-panel"><div className="editor-heading"><span><Code2 size={17}/>main.cpp<span className="editor-tag">C++17</span></span><div><button className="icon-btn" aria-label="Copy code" onClick={()=>navigator.clipboard.writeText(code).then(()=>notify('Code copied')).catch(()=>notify('Select the code and copy it manually.'))}><Copy size={16}/></button><button className="icon-btn" aria-label="Reset original code" onClick={()=>{if(code!==selected.code&&!window.confirm('Replace your edits with the original lesson code?'))return;setCode(selected.code);if(!writeLocal('oopnest-code-'+selected.id,null))notify('Could not clear the saved draft.');clearOutput()}}><RotateCcw size={16}/></button></div></div><textarea spellCheck={false} aria-label="C++ code editor" className="code-editor" value={code} onChange={e=>editCode(e.target.value)} onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();const t=e.currentTarget,start=t.selectionStart,end=t.selectionEnd;const c=code.slice(0,start)+'    '+code.slice(end);editCode(c);requestAnimationFrame(()=>{t.selectionStart=t.selectionEnd=start+4})}}}/><div className="editor-footer"><span>Edits saved on this device</span><button className="button primary" onClick={run} disabled={running}><Play size={15} fill="currentColor"/>{running?'Running…':'Run code'}</button></div></section><div className="output-side"><div className="aside-box"><span className="eyebrow">YOUR MINI MISSION</span><h3>{selected.title}, in the wild.</h3><p>{selected.challenge}</p><button className="text-button" onClick={()=>{clearOutput();setOutput('EXPECTED OUTPUT OF THE ORIGINAL EXAMPLE\n\n'+selected.output)}}>Show expected output<ArrowRight size={15}/></button></div><div className="input-box"><label htmlFor="stdin">Program input <small>(stdin)</small></label><textarea id="stdin" placeholder="Input for cin, if your program needs it…" value={stdin} onChange={e=>setStdin(e.target.value)}/></div><section className="terminal"><div><Terminal size={16}/>Output</div><pre aria-live="polite">{running?'Running your C++ program…':output||'Your program’s output will appear here.\n\nReady when you are.'}</pre></section></div></div><div className="compiler-notice"><Lightbulb size={19}/><p>Run your C++ program through OnlineCompiler.</p><button className="text-button" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));a.download='main.cpp';a.click();URL.revokeObjectURL(a.href)}}><Download size={16}/>Download .cpp</button></div></>}
 {view==='Resources'&&<><div className="resource-hero"><span className="resource-symbol"><Globe2 size={56}/></span><div><span className="eyebrow">A FAMILIAR LANGUAGE. A FRESH PERSPECTIVE.</span><h2>Your concepts. Your language.</h2><p>Watch in Hindi or Urdu. Practice in C++. Understand it your way.</p></div></div><div className="filter-group resource-filters">{['All languages','Hindi','Urdu / Hindi','English'].map(f=><button key={f} className={resourceFilter===f?'selected':''} onClick={()=>setResourceFilter(f)}>{f}</button>)}</div><div className="resource-grid">{resources.filter(r=>resourceFilter==='All languages'||r.language===resourceFilter).map(r=><a className="resource-card" key={r.title} href={r.url} target="_blank" rel="noopener noreferrer"><div className={'resource-image '+r.color}>{r.type==='Video'?<Play size={38}/>:<BookOpen size={38}/>}<span>{r.language}</span></div><div className="resource-info"><span className="lesson-label">{r.teacher} · {r.type}</span><h3>{r.title}<ArrowUpRight size={19}/></h3><p>{r.detail}</p><span className="world-link">Open {r.type==='Video'?'on YouTube':'resource'}<ExternalLink size={14}/></span></div></a>)}</div><p className="external-note">Videos and references belong to their respective creators and open externally. Resource links checked November 2026.</p></>}
 {view==='My notes'&&<><div className="notes-banner"><NotebookPen size={28}/><p>Your own words make the best revision notes. Add a note inside any lesson.<br/><small>{status==='loading'?'Loading notes…':status==='error'?'Account notes are unavailable.':'Synced to your account.'}</small></p></div><div className="notes-grid">{lessons.filter(l=>notes[l.id]?.trim()).map(l=><div className="note-card" key={l.id}><div><span className={'note-icon '+l.color}><TopicIcon lesson={l} size={20}/></span><h3>{l.title}</h3></div><p>{notes[l.id]}</p><button className="text-button" onClick={()=>openLesson(l)}>Edit note in lesson<ArrowUpRight size={15}/></button></div>)}</div>{status==='ready'&&!Object.values(notes).some(n=>n.trim())&&<div className="empty-state"><NotebookPen size={38}/><h3>Your next “aha!” belongs here.</h3><p>Open a lesson and jot down what makes the concept click.</p><button className="button primary" onClick={()=>openLesson(next)}>Open a lesson<ArrowRight size={17}/></button></div>}</>}
 {view==='My progress'&&<><div className="progress-hero"><div className="progress-ring" style={{background:`conic-gradient(var(--green) ${completed.length/8*360}deg, #e3e8dc 0)`}}><div><strong>{Math.round(completed.length/8*100)}%</strong><span>of your foundations</span></div></div><div><span className="eyebrow">EVERY LITTLE STEP COUNTS</span><h2>{completed.length===8?'Look how far you’ve come.':'Confidence, one concept at a time.'}</h2><p>{completed.length} {completed.length===1?'lesson':'lessons'} completed · {completed.length*20} XP earned</p><button className="button primary" onClick={()=>openLesson(next)}>{completed.length===8?'Revisit the foundations':'Take your next step'}<ArrowRight size={17}/></button></div></div><div className="progress-list">{lessons.map(l=><button key={l.id} onClick={()=>openLesson(l)}><span className={'stat-icon '+l.color}><TopicIcon lesson={l} size={22}/></span><div><h3>{l.title}</h3><p>{l.world}</p></div><span className={completed.includes(l.id)?'done-status':'todo-status'}>{completed.includes(l.id)?<><CheckCircle2 size={16}/>Completed · 20 XP</>:<><Clock size={16}/>Ready to explore</>}</span><ArrowUpRight size={17}/></button>)}</div></>}
 {view==='Admin workspace'&&status==='ready'&&(isAdmin?<StudentDirectory key={user.id}/>:<div className="empty-state admin-state">
  <Shield size={40}/><span className="eyebrow">FOR EDUCATORS & ADMINISTRATORS</span><h2>A clearer view of every learner.</h2>
  <p>Your account has student access. An administrator can grant educator access.</p>
  <div className="admin-features"><span><GraduationCap size={20}/>Student directory</span><span><Compass size={20}/>Lesson completion</span><span><Shield size={20}/>Role-based access</span></div>
 </div>)}
 <footer><span><span className="footer-logo">oopnest.</span> A friendly place for powerful ideas.</span><span>Built for curious minds <span className="footer-star">✳</span></span></footer></main></div>
 {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}</div>
}
function Example({l,saved,toggle,open}:{l:Lesson;saved:boolean;toggle:()=>void;open:()=>void}){return <article className="example-card"><div className={'example-art '+l.color}><span className="example-illustration"><TopicIcon lesson={l} size={58}/></span><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-star-small">✦</span><span className="example-code">{'{ }'}</span><span className="concept-tag">{l.title}</span><button className={'bookmark '+(saved?'bookmarked':'')} aria-label={(saved?'Unsave ':'Save ')+l.world} onClick={toggle}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button></div><button className="example-body" onClick={open}><h3>{l.world}<ArrowUpRight size={19}/></h3><p>{l.description}</p><div className="card-bottom"><span><span className="green-dot"/>Beginner friendly</span><span>{l.minutes} min<ArrowRight size={15}/></span></div></button></article>}
function CodeBlock({code}:{code:string}){return <pre className="code-block"><code>{code.split('\n').map((line,i)=><div key={i}><span className="line-number">{i+1}</span><span>{line.split(/("[^"]*"|\b(?:class|public|private|int|void|return|virtual|override|using|namespace|const|string|default)\b)/g).map((s,j)=><span className={s.startsWith('"')?'syntax-string':/^(class|public|private|int|void|return|virtual|override|using|namespace|const|string|default)$/.test(s)?'syntax-keyword':''} key={j}>{s}</span>)}</span></div>)}</code></pre>}
function NoteEditor({value,onSave,disabled}:{value:string;onSave:(body:string)=>Promise<void>;disabled:boolean}){
 const [draft,setDraft]=useState(value);
 const [saving,setSaving]=useState(false);
 useEffect(()=>setDraft(value),[value]);
 async function save(){
  setSaving(true);
  try{await onSave(draft)}finally{setSaving(false)}
 }
 return <div className="aside-box note-editor">
  <h3><NotebookPen size={18}/>Your “aha!” notes</h3>
  <label htmlFor="lesson-note">What made it click?</label>
  <textarea id="lesson-note" maxLength={20000} value={draft} onChange={e=>setDraft(e.target.value)} disabled={disabled||saving} placeholder="In my own words, a class is…"/>
  <button className="button secondary" onClick={save} disabled={disabled||saving||draft===value}>{saving?'Saving note…':'Save note'}<Check size={15}/></button>
 </div>;
}
