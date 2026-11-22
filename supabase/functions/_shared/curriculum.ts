export type Stage = 'ipo' | 'steps' | 'write' | 'flow' | 'compare' | 'pseudo' | 'quiz' | 'predict' | 'code';
export type Shape = 'start' | 'end' | 'io' | 'process' | 'decision';
export type FlowCard = { id: string; text: string; shape: Shape; column?: number };
export type Edge = { from: string; to: string; label?: 'Yes' | 'No' };
type Comparison = {
  methods: [string, string];
  anchors: [string, string];
  situation: string;
  better: 0 | 1;
  reason: string;
};
type ProblemSeed = {
  id: string;
  title: string;
  story: string;
  ipo: [string, string, string];
  steps: string[];
  keywords: string[];
  nudge: string;
  comparison?: Comparison;
  decision?: [question: string, yes: string, no: string];
};

const realWorld: ProblemSeed[] = [
  {
    id: 'chai', title: 'Make a cup of chai', story: 'Lab ke baad ek cup chai chahiye. Doodh, pani, patti aur cheeni ready hain. Garam chai cup tak kaise pohanchay gi?',
    ipo: ['Doodh, pani, patti aur cheeni', 'Chai garam karo aur chaano', 'Ek cup garam chai'],
    steps: ['Measure water and milk', 'Heat the liquid', 'Add tea leaves and sugar', 'Simmer the tea', 'Strain into a cup'],
    keywords: ['pani|water|milk|doodh', 'heat|boil|garam|ubal|ubaa', 'patti|leaves|tea bag', 'cup|serve|chaan|strain|pour'],
    nudge: 'Socho cup mein chai aane se pehle patti aur garam pani ka kya karna hai.',
    comparison: { methods: ['Loose leaves in a pan', 'Tea bag in a cup'], anchors: ['patti|leaves|strain|chaan', 'bag|teabag'], situation: 'Sirf ek cup chahiye. Strainer available nahi hai. Kaunsa tareeqa asaan hai?', better: 1, reason: 'strainer|chaan|strain|bag|easy|asaan|bartan|cup' },
  },
  {
    id: 'lemon', title: 'Make nimbu pani', story: 'Garmi hai aur do doston ko nimbu pani chahiye. Pani, nimbu, cheeni aur do glass hain. Dono ko ek jaisa taste chahiye.',
    ipo: ['Pani, nimbu aur cheeni', 'Juice aur cheeni pani mein milao', 'Do glass nimbu pani'],
    steps: ['Measure the water', 'Squeeze the lemons', 'Add sugar', 'Stir the mixture', 'Serve in two glasses'],
    keywords: ['water|pani', 'nimbu|lemon|squeeze', 'cheeni|sugar', 'stir|mix|milao|glass'], nudge: 'Do glass mein same taste ke liye mix ko serve karne se pehle check karo.',
    comparison: { methods: ['Mix in one jug', 'Mix in each glass'], anchors: ['jug|pitcher', 'each|alag|separate|har glass'], situation: 'Dono doston ko same taste chahiye. Kaunsa tareeqa behtar hai?', better: 0, reason: 'same|equal|taste|mix|jug|jaisa|barabar' },
  },
  {
    id: 'lock', title: 'Open a locked box', story: 'Lab ka marker locked dabbe ke andar hai. Tumhare paas labelled keys hain. Sahi key dhoondo aur marker nikalo.',
    ipo: ['Locked dabba aur keys', 'Sahi key dhoond kar lock kholo', 'Marker dabbe se bahar'],
    steps: ['Look at the box label', 'Pick the matching key', 'Put the key in the lock', 'Turn the key and open the lid', 'Take out the marker'],
    keywords: ['label|number|key|chabi|chaabi', 'put|insert|daal|lagao', 'turn|ghuma|open|kholo', 'marker|nikal|lid'], nudge: 'Key fit ho jaye tab bhi marker tak pohanchne ke liye kya karna hai?',
    decision: ['Key fits?', 'Turn the key and open the lid', 'Get the matching spare key and open the lid'],
    comparison: { methods: ['Match the label first', 'Try the keys one at a time'], anchors: ['label|number|match|naam', 'try|ek ek|one at a time|baari'], situation: '20 keys hain aur sab labels clear hain. Kaunsa tareeqa jaldi hai?', better: 0, reason: 'time|jaldi|fast|label|match|kam|quick' },
  },
  {
    id: 'canteen', title: 'Get lunch in a rush', story: 'Break mein sirf 10 minutes hain. Canteen mein cooked food aur ready snacks dono hain. Budget Rs 200 hai.',
    ipo: ['Rs 200, 10 minutes aur menu', 'Wait aur price dekh kar order do', 'Break ke andar lunch'],
    steps: ['Check the menu prices', 'Check the wait time', 'Pick a meal within both limits', 'Place the order and pay', 'Collect the food'],
    keywords: ['menu|price|budget|rate|200', 'wait|time|minute|waqt', 'order|pay|payment|paisa', 'collect|food|khana|snack'], nudge: 'Price theek ho to bhi ek aur cheez order se pehle check karni hai.',
    decision: ['Cooked meal ready in time?', 'Order the cooked meal', 'Pick a ready snack'],
    comparison: { methods: ['Order a cooked meal', 'Buy a ready snack'], anchors: ['cooked|cook|garam|meal', 'ready|snack|packed'], situation: 'Cooked meal ko 15 minutes lagenge. Tumhare paas 10 minutes hain. Kya lo gi?', better: 1, reason: 'time|wait|minutes|ready|jaldi|fast|waqt' },
  },
  {
    id: 'break', title: 'Plan a 30-minute break', story: 'Class se pehle 30 minutes hain. Lunch, thora revision aur room tak walk karni hai. Late nahi hona.',
    ipo: ['30 minutes aur teen kaam', 'Har kaam ka time set karo', 'Class tak time par pohanchna'],
    steps: ['Check how long the walk takes', 'Reserve time for the walk', 'Set lunch and revision times', 'Follow the plan', 'Reach the classroom'],
    keywords: ['walk|chal|raasta', 'time|minute|waqt', 'lunch|khana|revision|parh|study', 'class|reach|pohanch'], nudge: 'Aakhri walk ka time pehle se side par rakhna help karega.',
    comparison: { methods: ['Eat first, then revise', 'Revise first, then eat'], anchors: ['eat first|lunch first|pehle kha|pehle lunch', 'revise first|revision first|pehle revision|pehle parh'], situation: 'Food counter 10 minutes mein band ho jayega. Pehle kya karna behtar hai?', better: 0, reason: 'close|band|counter|food|lunch|10' },
  },
  {
    id: 'battery', title: 'Phone battery at 5%', story: 'University se ghar jana hai aur phone sirf 5% par hai. Ride details phone par hain. Battery bachao aur details safe rakho.',
    ipo: ['5% battery aur ride ki details', 'Details save karo aur battery bachao', 'Ride ke liye details available'],
    steps: ['Open the ride details', 'Save the pickup details', 'Turn on battery saver', 'Lower the brightness', 'Use the saved details at pickup'],
    keywords: ['ride|pickup|details', 'save|write|note|screenshot|likh', 'battery|charger|charge|power', 'pickup|brightness|screen|saver|use'], nudge: 'Sab se pehle socho phone band ho jaye to pickup ki details kahan hongi.',
    decision: ['Charger available?', 'Plug in the phone', 'Switch on battery saver'],
    comparison: { methods: ['Charge the phone', 'Use battery saver and write down details'], anchors: ['charge|charger|plug', 'saver|write|paper|likh'], situation: 'Outlets busy hain aur ride abhi aa rahi hai. Kaunsa tareeqa workable hai?', better: 1, reason: 'outlet|charger|time|paper|saver|abhi|busy|available' },
  },
  {
    id: 'rain', title: 'Get to university in rain', story: 'Barish ho rahi hai. Class 25 minutes mein hai. Main road par bus mil sakti hai. Bag aur notes dry rakhne hain.',
    ipo: ['Barish, bag aur class ka time', 'Bag cover karo aur ride choose karo', 'Dry notes ke saath class tak jana'],
    steps: ['Check the class start time', 'Cover the bag', 'Check the bus wait time', 'Take the ride', 'Enter class with dry notes'],
    keywords: ['time|minute|waqt', 'bag|cover|raincoat|umbrella|plastic', 'bus|ride|rickshaw|walk', 'class|university|uni|dry|pohanch'], nudge: 'Ride choose karne ke saath notes ko barish se bhi bachana hai.',
    decision: ['Bus arrives in time?', 'Take the bus', 'Book a rickshaw'],
    comparison: { methods: ['Wait for the bus', 'Take a rickshaw'], anchors: ['bus', 'rickshaw|rikhsha|riksha'], situation: 'Bus 40 minutes baad aayegi. Class 25 minutes mein hai aur rickshaw ready hai. Kya karo gi?', better: 1, reason: 'time|late|minutes|ready|jaldi|40|25' },
  },
  {
    id: 'room', title: 'Clean your room', story: 'Floor par kapray, books aur wrappers hain. Sweeping se pehle floor clear karna hai.',
    ipo: ['Messy room aur cleaning supplies', 'Cheezein sort karo aur floor saaf karo', 'Clean room'],
    steps: ['Find a bin and a laundry basket', 'Put rubbish in the bin', 'Put clothes in the basket', 'Move the books to the shelf', 'Sweep the floor'],
    keywords: ['trash|rubbish|wrapper|kacha|kachra|bin', 'clothes|kapr|laundry', 'book|kitaab|kitab|shelf', 'sweep|floor|jhar|jharr|saaf'], nudge: 'Jhaaru lagane se pehle floor se kya hatao gi?',
    comparison: { methods: ['Clear the whole floor first', 'Clean one area at a time'], anchors: ['whole|all|poora|sara|saara', 'area|corner|one at a time|kona|hissa'], situation: 'Do log ek saath full floor sweep karenge. Kaunsa tareeqa un dono ke liye floor jaldi ready karega?', better: 0, reason: 'whole|all|floor|sweep|space|poora|dono|clear' },
  },
  {
    id: 'bag', title: 'Pack your lab bag', story: 'Kal PF lab hai. ID card, notebook, pen aur charged phone chahiye. Ghar se nikalne se pehle sab verify karo.',
    ipo: ['Lab ki list aur available items', 'Items check karo aur bag pack karo', 'Lab ke liye complete bag'],
    steps: ['Read the lab list', 'Collect the items', 'Check the phone battery', 'Put each item in the bag', 'Check the bag against the list'],
    keywords: ['list|checklist|yaad', 'item|book|notebook|pen|id', 'phone|battery|charge', 'bag|pack|rakho'], nudge: 'Bag band karne se pehle list se ek baar match karo.',
    comparison: { methods: ['Use a checklist', 'Pack from memory'], anchors: ['list|checklist', 'memory|yaad|dimagh'], situation: 'Lab ne aaj ek extra item add kiya hai. Bhoolne ka chance kis mein kam hai?', better: 0, reason: 'new|extra|list|forget|bhool|check|item' },
  },
  {
    id: 'water', title: 'Refill your water bottle', story: 'Bottle khaali hai. Lab shuru honay wali hai. Corridor mein cooler hai aur doosra cooler next floor par hai.',
    ipo: ['Empty bottle, cooler aur time', 'Available cooler se bottle bharo', 'Filled aur closed bottle'],
    steps: ['Check the nearby cooler', 'Open the empty bottle', 'Put the bottle under the tap', 'Fill the bottle', 'Close the lid'],
    keywords: ['cooler|tap|nal', 'bottle|botal', 'fill|pani|water|bhar', 'close|lid|cap|band'], nudge: 'Fill honay ke baad bottle bag mein rakhne ke liye kya karna hai?',
    decision: ['Nearby cooler working?', 'Fill here', 'Fill at the next-floor cooler'],
    comparison: { methods: ['Use the nearby cooler', 'Use the next-floor cooler'], anchors: ['near|paas|corridor', 'next|floor|upar'], situation: 'Nearby cooler band hai. Doosra chal raha hai. Kahan jao gi?', better: 1, reason: 'working|chal|band|broken|available|next|floor' },
  },
];

const calculations: ProblemSeed[] = [
  {
    id: 'marks', title: 'Total and average', story: 'Ali ke marks 60, 75 aur 90 hain. Teacher ko teenon ka total aur har subject ka average chahiye.',
    ipo: ['Three marks: 60, 75, 90', 'Add the marks and divide the total by 3', 'Total marks and average'],
    steps: ['Take the three marks', 'Add all three marks', 'Divide the total by 3', 'Show the total and average'],
    keywords: ['take|read|get|input|60|marks', 'add|sum|total|jama|225|\u002b', 'divide|taqseem|/|75', 'show|write|output|display|report|result'], nudge: 'Average ke liye subjects kitne hain? Total ko us number se divide karo.',
  },
  {
    id: 'percentage', title: 'Find the percentage', story: 'Sara ko 450 mein se 360 marks milay. Form mein answer out of 100 chahiye. Percentage kaise nikalo gi?',
    ipo: ['360 marks out of 450', 'Divide by full marks, then multiply by 100', 'Percentage out of 100'],
    steps: ['Take scored and full marks', 'Divide scored marks by full marks', 'Multiply the result by 100', 'Show the percentage'],
    keywords: ['take|read|input|marks|360', 'divide|taqseem|/|ratio', 'multiply|times|100|\u002a', 'show|display|output|write|percent|80'], nudge: 'Pehle apne marks ko full marks se compare karo. Phir out of 100 banao.',
  },
  {
    id: 'discount', title: 'Work out a shop discount', story: 'Bag Rs 2,000 ka hai aur 10% off hai. Cash counter par kitne paisay dene hain?',
    ipo: ['Rs 2,000 and 10% off', 'Find the discount and subtract it', 'Final price in rupees'],
    steps: ['Take the price and discount rate', 'Find 10 percent of the price', 'Subtract the discount from the price', 'Show the amount to pay'],
    keywords: ['price|2000|2,000|input|take', '10|discount|percent', 'subtract|minus|deduct|less|kam|1800|1,800', 'show|display|output|pay|write|final'], nudge: 'Discount ki amount ko original price mein se nikaal do.',
  },
  {
    id: 'cinema', title: 'Price the cinema tickets', story: 'Do adults aur teen children movie dekhne ja rahe hain. Adult ticket Rs 500 aur child ticket Rs 300 hai. Counter ka total nikalo.',
    ipo: ['Ticket counts and prices for adults and children', 'Multiply each count by its price and add both amounts', 'Total ticket cost'],
    steps: ['Take both ticket counts and prices', 'Find the adult ticket cost', 'Find the child ticket cost', 'Add both costs', 'Show the ticket total'],
    keywords: ['take|input|read|count|2 adult', 'adult|500|1000', 'child|300|900', 'add|sum|1900|1,900', 'show|display|output|pay|write|total'], nudge: 'Adult aur child ki price alag hai. Dono amounts alag nikaal kar joro.',
  },
  {
    id: 'bill', title: 'Split a lunch bill', story: 'Char dost Rs 2,400 ka lunch bill barabar pay karna chahte hain. Har dost kitna dega?',
    ipo: ['Rs 2,400 and four friends', 'Divide the bill by the number of friends', 'One friend’s share'],
    steps: ['Take the bill amount', 'Count the friends', 'Divide the bill by the count', 'Show each friend’s share'],
    keywords: ['bill|2400|2,400|amount', 'friends|people|count|four|4', 'divide|taqseem|/|600', 'show|display|output|each|write|share'], nudge: 'Barabar share chahiye. Total ko kitne logon mein baantna hai?',
  },
  {
    id: 'rectangle', title: 'Measure a rectangle', story: 'Lab board 6 metres lamba aur 3 metres chora hai. Cover karne ke liye area kitna chahiye?',
    ipo: ['Length 6 m and width 3 m', 'Multiply length by width', 'Area in square metres'],
    steps: ['Take the length', 'Take the width', 'Multiply length by width', 'Show the area in square metres'],
    keywords: ['length|lamba|6', 'width|chora|3', 'multiply|times|\u002a|18', 'show|display|output|write|area|square'], nudge: 'Area ke liye lambaai aur choraai ko multiply karo.',
  },
  {
    id: 'temperature', title: 'Convert a temperature', story: 'Weather app 25°C dikhati hai. Doosri app Fahrenheit maangti hai. Rule hai Celsius ko 9/5 se multiply karo, phir 32 add karo.',
    ipo: ['25 degrees Celsius', 'Multiply by 9/5, then add 32', 'Temperature in Fahrenheit'],
    steps: ['Take the Celsius temperature', 'Multiply it by 9/5', 'Add 32', 'Show the Fahrenheit temperature'],
    keywords: ['celsius|25|take|read', 'multiply|times|9/5|1.8', 'add|32|plus', 'show|display|output|write|fahrenheit|77'], nudge: '32 add karne ka step multiplication ke baad aata hai.',
  },
  {
    id: 'salary', title: 'Add a salary bonus', story: 'Monthly salary Rs 40,000 hai. Is month 5% bonus mila hai. Bonus samait payment kitni hogi?',
    ipo: ['Rs 40,000 salary and a 5% bonus', 'Work out the bonus and add it to the salary', 'Salary including the bonus'],
    steps: ['Take salary and bonus rate', 'Find 5 percent of the salary', 'Add the bonus to the salary', 'Show the new payment'],
    keywords: ['salary|40000|40,000|take', 'bonus|5|percent|2000', 'add|plus|sum|42000|42,000', 'show|display|output|write|payment'], nudge: 'Bonus ki rupee amount pehle nikalo. Phir base salary mein joro.',
  },
];

export const calculationResults: Record<string, number[]> = {
  marks: [225, 75], percentage: [80], discount: [1800], cinema: [1900], bill: [600], rectangle: [18], temperature: [77], salary: [42000],
};

function flowFor(seed: ProblemSeed) {
  const start: FlowCard = { id: 'start', text: 'Begin', shape: 'start' };
  const input: FlowCard = { id: 'input', text: seed.ipo[0], shape: 'io' };
  const output: FlowCard = { id: 'output', text: seed.ipo[2], shape: 'io' };
  const end: FlowCard = { id: 'end', text: 'Finish', shape: 'end' };
  if (seed.decision) {
    const [question, yes, no] = seed.decision;
    const cards: FlowCard[] = [start, input, { id: 'decision', text: question, shape: 'decision' },
      { id: 'yes', text: yes, shape: 'process', column: -1 }, { id: 'no', text: no, shape: 'process', column: 1 }, output, end];
    const edges: Edge[] = [{ from: 'start', to: 'input' }, { from: 'input', to: 'decision' },
      { from: 'decision', to: 'yes', label: 'Yes' }, { from: 'decision', to: 'no', label: 'No' },
      { from: 'yes', to: 'output' }, { from: 'no', to: 'output' }, { from: 'output', to: 'end' }];
    return { cards, edges };
  }
  const cards: FlowCard[] = [start, input, { id: 'action', text: seed.ipo[1], shape: 'process' }, output, end];
  return { cards, edges: cards.slice(1).map((card, index) => ({ from: cards[index].id, to: card.id })) as Edge[] };
}

function problem(seed: ProblemSeed, module: 1 | 2) {
  const stages: Stage[] = module === 1 ? ['ipo', 'steps', 'write', 'flow', 'compare'] : ['ipo', 'steps', 'flow', 'pseudo'];
  return { ...seed, kind: 'problem' as const, module, stages, flow: flowFor(seed) };
}

const quiz = {
  id: 'better-way', kind: 'quiz' as const, module: 1 as const, title: 'Pick a better way', stages: ['quiz'] as Stage[],
  story: 'Tumhare paas 5 minutes hain. Canteen mein sandwich ready hai. Fresh fries ko 12 minutes lagenge. Class time par join karni hai.',
  comparison: { methods: ['Wait for the fries', 'Buy the ready sandwich'], anchors: ['fries', 'sandwich'],
    situation: 'Kaunsa tareeqa yahan behtar hai? Ek line mein reason likho.', better: 1, reason: 'time|minute|5|12|ready|late|jaldi|class|wait' } satisfies Comparison,
};

function coding(id: string, title: string, story: string, sample: string, starter: string, detail: string, task: string, hint: string, lesson: number) {
  return { id, title, story, sample, starter, detail, task, hint, lesson, module: 3 as const, kind: 'code' as const, stages: ['predict', 'code'] as Stage[] };
}

export const lessons = [
  ...realWorld.map(seed => problem(seed, 1)), quiz, ...calculations.map(seed => problem(seed, 2)),
  coding('hello', 'Your first message', 'Lab computer par dost ko Hello dikhana hai. Neechay wali line screen par kya likhegi?',
    'cout << "Hello";', 'cout << "Hello";', 'cout screen par dikhata hai. << text ko cout tak bhejta hai. Quotes text ko gherte hain. ; line khatam karta hai.',
    'Edit the quoted text so the screen shows Salaam.', 'Sirf quotes ke andar text badlo. Aakhir mein ; dekho.', 1),
  coding('newline', 'Start a new line', 'Notice par pehli aur doosri baat alag lines par chahiye. Dekho ye message kahan break hoga.',
    String.raw`cout << "Lab\nToday";`, String.raw`cout << "Name\nClass";`, String.raw`\n agli line par le jata hai. endl bhi nayi line bana sakta hai. Example: cout << "Lab" << endl;`,
    'Print Ready on line 1 and Go on line 2. Use \\n.', String.raw`Ready aur Go ke beech \n quotes ke andar likho.`, 2),
  coding('tab', 'Line up two columns', 'Lab list mein naam aur roll number alag columns mein chahiye. Predict karo dono words kaise nazar aayenge.',
    String.raw`cout << "Name\tRoll";`, String.raw`cout << "Name\tRoll";`, String.raw`\t tab ki jagah banata hai. Column banane ke liye text ke beech likho.`,
    'Print Sara, then a tab, then 07.', String.raw`Quotes ke andar Sara aur 07 ke beech \t use karo.`, 3),
  coding('escape', 'Print signs and an alert', 'Screen par Done ko quotes mein dikhana hai, phir ek backslash. Aakhir mein alert ka signal chahiye.',
    String.raw`cout << "\"Done\" \\" << "\a";`, String.raw`cout << "\"Done\" \\" << "\a";`, String.raw`\" se quote, \\ se ek backslash, aur \a se alert ka signal banta hai. Simulator alert ka note dikhata hai.`,
    'Print "Saved" in quotes, one space, one backslash, and an alert.', String.raw`Text ke andar quote ke liye \" aur ek backslash ke liye \\ likho. Alert ke liye \a.`, 4),
  coding('profile-print', 'Make a small intro card', 'Class intro ke liye apna naam, class aur favourite cheez teen saaf rows mein dikhani hain.',
    String.raw`cout << "Class\tBS CS\nLike\tChai";`, String.raw`cout << "Name\t\nClass\t\nLike\t";`, String.raw`Har row ke label ke baad \t. Agli row ke liye \n. << se cout mein multiple text parts jor sakti ho.`,
    'Fill in Name, Class and Like with your own answers. Keep one tab before each answer and three rows.', 'Har row mein label ke baad tab aur apna answer likho.', 5),
];

export type Lesson = typeof lessons[number];
export type Problem = Extract<Lesson, { kind: 'problem' }>;
export type CodeLesson = Extract<Lesson, { kind: 'code' }>;

export const modules = [
  { id: 1, name: 'Socho', title: 'Real-world problems', detail: 'Ghar aur university ke kaamon ko chhotay steps mein karo.' },
  { id: 2, name: 'Hisab', title: 'Sum, average & calculations', detail: 'Marks, bills aur prices ke liye apna tareeqa banao.' },
  { id: 3, name: 'Pehla Code', title: 'Your first C++ output', detail: 'Screen par text dikhao, ek line se shuru karo.' },
  { id: 4, name: 'Ahista Ahista Agay', title: 'Coming soon', detail: 'Coming soon — pehle Module 3 complete karo.' },
] as const;

export const futureTopics = ['Variables', 'cin (input)', 'Simple calculations', 'if-else', 'Loops'];
export const stageLabels: Record<Stage, string> = {
  ipo: 'Sort Input, Processing and Output', steps: 'Put the steps in order', write: 'Write your own steps',
  flow: 'Build a flowchart', compare: 'Compare two ways', pseudo: 'Write pseudocode',
  quiz: 'Choose and explain', predict: 'Predict the output', code: 'Edit and run',
};
