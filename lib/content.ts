export const appName = 'PF Step by Step';

export const stageNames = {
  ipo: 'Input, processing, output',
  steps: 'Write your steps',
  chart: 'Draw a flowchart',
  compare: 'Compare your ways',
  code: 'Try it in C++',
} as const;

export type Stage = keyof typeof stageNames;
export type Question = {
  prompt: string;
  choices: readonly string[];
  correct: number;
  hint: string;
  why: string;
};

export type ChartNode = {
  text: string;
  shape: 'action' | 'choice' | 'input';
};

export type Flowchart = {
  nodes: readonly ChartNode[];
  order: readonly number[];
  kind: 'line' | 'branch' | 'loop';
  hint: string;
  branches?: readonly [string, string];
};

export type Lesson = {
  id: string;
  title: string;
  story: string;
  urdu: string;
  ipo: readonly [Question, Question, Question];
  steps: Question;
  chart: Flowchart;
  alternate: string;
  compare: Question;
  takeaway: string;
  code?: { source: string; input: string; question: Question };
};

type Module = {
  id: string;
  title: string;
  description: string;
  tone: 'mint' | 'sky' | 'peach' | 'butter' | 'lilac';
  lessons: readonly Lesson[];
};

function question(prompt: string, choices: readonly string[], correct: number, hint: string, why: string): Question {
  return { prompt, choices, correct, hint, why };
}

export const modules: readonly Module[] = [
  {
    id: 'everyday', title: 'Think in Steps', tone: 'mint',
    description: 'Break familiar problems into small steps.',
    lessons: [
      {
        id: 'chai', title: 'Make a cup of chai',
        story: 'The next lab starts in ten minutes. A friend asks for one cup of chai. You have water, milk and a tea bag. How would you get a hot cup ready in time?',
        urdu: 'Agli lab das minute mein hai. Dost ke liye aik cup chai banani hai. Paani, doodh aur tea bag hain. Garam chai kaise banaoge?',
        ipo: [
          question('What do you start with?', ['A cup of hot chai', 'Water, milk and a tea bag', 'Heating and mixing'], 1, 'Think of what is on the counter before you begin.', 'The tea starts with ingredients you already have.'),
          question('What work will you do?', ['Heat, steep and mix', 'A cup of hot chai', 'Water and milk'], 0, 'Look for actions you can do with your hands.', 'Heating, steeping and mixing turn the ingredients into chai.'),
          question('What do you want at the end?', ['Cold water', 'A tea bag', 'A cup of hot chai'], 2, 'Think of what you will hand to your friend.', 'A hot cup of chai is the result your friend asked for.'),
        ],
        steps: question('Which step must happen before you steep the tea bag?', ['Serve the chai', 'Heat the water', 'Put away the cup'], 1, 'Think about what helps the tea bag release its flavor.', 'Heat the water before you steep the tea bag.'),
        chart: {
          kind: 'line',
          nodes: [{ text: 'Serve the chai', shape: 'input' }, { text: 'Heat the water', shape: 'action' }, { text: 'Steep the tea and add milk', shape: 'action' }],
          order: [1, 2, 0], hint: 'Read from Start down. Which action makes the water ready for the tea?',
        },
        alternate: 'Try changing when you add the milk or where you steep the tea. Both ways should still make a hot cup.',
        compare: question('If the kettle is already hot and you only need one cup, which way uses fewer things?', ['Steep the tea in the cup using hot kettle water', 'Heat the same water again in a separate pan', 'Use a fresh pan for each ingredient'], 0, 'Count the things you would need to use and wash.', 'Steeping directly in the cup uses the kettle and cup without adding a pan.'),
        takeaway: 'The things you start with are the input. The work you do is processing. Your result is the output. Write your steps (tareeqa) so someone else can follow them, then use arrows to show their order.',
      },
      {
        id: 'canteen', title: 'Split the canteen bill',
        story: 'Three classmates share a Rs 600 canteen bill equally. They want to know what each person owes. How would you work it out?',
        urdu: 'Teen classmates Rs 600 ka bill barabar baantna chahte hain. Har shakhs kitne paise dega? Kaise pata karoge?',
        ipo: [
          question('What numbers do you need?', ['The price of one plate', 'The amount each person owes', 'The total bill and number of people'], 2, 'You need both the amount to share and how many shares to make.', 'The total and the number of people are both inputs.'),
          question('What do you do with these numbers?', ['Multiply 600 by 3', 'Divide 600 by 3', 'Add 600 and 3'], 1, 'You are making three equal shares out of one total.', 'Dividing makes three equal shares.'),
          question('What should you tell each classmate?', ['Rs 200', 'Rs 600', 'Rs 1,800'], 0, 'Check that three copies of your amount add up to Rs 600.', 'Three shares of Rs 200 add up to Rs 600.'),
        ],
        steps: question('Before making equal shares, what should you check?', ['That some money has already been paid', 'That the plates have been cleared', 'That you know how many people are sharing'], 2, 'Imagine a fourth person joins. What part of your plan would change?', 'Count the people before deciding how many shares to make.'),
        chart: {
          kind: 'line',
          nodes: [{ text: 'Divide the bill by the number of people', shape: 'action' }, { text: 'Tell each person their share', shape: 'input' }, { text: 'Read the total and count the people', shape: 'input' }],
          order: [2, 0, 1], hint: 'Look for the box that collects the two things needed for the calculation.',
        },
        alternate: 'You could divide once or count up with equal shares. Write out another way that gets the same amount.',
        compare: question('What is the quickest way to split a different total among ten people?', ['Guess each share once', 'Divide the total by ten', 'Keep trying random amounts'], 1, 'Choose a way that gives you the amount in one calculation.', 'One division works even when the bill or group gets bigger.'),
        takeaway: 'A useful set of steps works when the input changes. Check a result by putting the shares back together and seeing if they match the original bill.',
      },
    ],
  },
  {
    id: 'plans', title: 'Map Your Steps', tone: 'sky',
    description: 'Use clear steps and arrows for choices and repeated work.',
    lessons: [
      {
        id: 'umbrella', title: 'Take an umbrella?',
        story: 'You are about to walk to class. Borrowing an umbrella is easy, but carrying it is a bother when it is dry. Make a plan that helps you decide each morning.',
        urdu: 'Class tak paidal jana hai. Baarish ho to chhatri chahiye, warna usay uthana mushkil hai. Roz ka faisla kaise karoge?',
        ipo: [
          question('What do you need to know first?', ['If it is raining now', 'What time the lab ends', 'What color the umbrella is'], 0, 'What would make you change your mind about carrying it?', 'The current weather is the input for this plan.'),
          question('What do you do with that information?', ['Always take the umbrella', 'Use the weather to choose one of two actions', 'Ask a friend to carry your bag'], 1, 'Your plan needs a different action for each kind of weather.', 'You make a choice based on whether it is raining.'),
          question('What is the result of the plan?', ['The temperature', 'The length of the walk', 'A decision to take or leave the umbrella'], 2, 'Think of what you will do just before going out.', 'The result tells you whether to take the umbrella.'),
        ],
        steps: question('How should your steps handle a dry morning?', ['Include an action for when it is dry', 'End the plan before checking the weather', 'Repeat the rain action every time'], 0, 'Could someone follow the plan when the answer to “Is it raining?” is no?', 'Clear steps cover both the yes and the no case.'),
        chart: {
          kind: 'branch',
          nodes: [{ text: 'Leave the umbrella', shape: 'action' }, { text: 'Take the umbrella', shape: 'action' }, { text: 'Is it raining?', shape: 'choice' }],
          order: [2, 1, 0], branches: ['Yes', 'No'], hint: 'Put the question before the split, then follow each labeled arrow.',
        },
        alternate: 'You might look outside or ask someone who just came in. Try a second set of steps that still covers rain and dry weather.',
        compare: question('If the window has a clear view and the forecast is an hour old, which first step answers the question now?', ['Follow the forecast without checking', 'Look out the window', 'Decide based on yesterday'], 1, 'The question asks about what is happening right now.', 'A clear view gives you current information in this situation.'),
        takeaway: 'You have written several sets of steps by now. A clear set of steps for solving a problem is called an algorithm. A flowchart can show a choice with a diamond and a separate arrow for each possible answer.',
      },
      {
        id: 'attendance', title: 'Count lab attendance',
        story: 'The lab has four rows of seats. Aimen needs the total number of students in the room. How can you count them without skipping or counting anyone twice?',
        urdu: 'Lab mein chaar qatarein hain. Aimen ko students ki kul ginti chahiye. Har student ko aik martaba kaise ginoge?',
        ipo: [
          question('What information will you use?', ['The number of lab computers', 'Who is in each row', 'How long the class lasts'], 1, 'Look at the people who are actually in the room.', 'The student count for each row is what you start with.'),
          question('How will you get the total?', ['Add each row’s count once', 'Use the count of the last row only', 'Count the same row twice'], 0, 'Have a place to keep your total as you move from row to row.', 'Adding each row once includes everyone once.'),
          question('What should you give Aimen?', ['The number of rows', 'The number of empty chairs in the back', 'The total number of students present'], 2, 'Think about the number Aimen asked for.', 'Your output is one total for the whole lab.'),
        ],
        steps: question('What should your running total be before you count the first row?', ['Zero', 'Four', 'The number in the first row'], 0, 'No students have been counted at the start.', 'Start at zero so the first row is only added once.'),
        chart: {
          kind: 'loop',
          nodes: [{ text: 'Share the total', shape: 'input' }, { text: 'Set the total to zero', shape: 'action' }, { text: 'Count the next row and add it', shape: 'action' }, { text: 'Any rows left?', shape: 'choice' }],
          order: [1, 3, 2, 0], branches: ['Yes', 'No'], hint: 'Start with an empty total. Ask whether a row is left before you count it.',
        },
        alternate: 'Try counting row by row in one way, and counting each seated student in order in another.',
        compare: question('For a crowded room where your count may be interrupted, which approach is easiest to check?', ['Guess how full the room looks', 'Start over any time someone speaks', 'Write a small count for each row, then add'], 2, 'Which approach leaves a record you can check after an interruption?', 'Recording row counts makes it easier to see which parts of the room you already counted.'),
        takeaway: 'When the same action is needed again, an arrow can lead back to an earlier question. Have a clear rule for when to stop.',
      },
    ],
  },
  {
    id: 'first-program', title: 'First Steps in C++', tone: 'peach',
    description: 'Turn a plan you understand into a small program.',
    lessons: [
      {
        id: 'receipt', title: 'Print a tuck-shop total',
        story: 'A tuck shop sells a bun for Rs 40 and a juice for Rs 80. A student buys one of each and needs the total on a small receipt. How will you make it?',
        urdu: 'Tuck shop par bun Rs 40 ka aur juice Rs 80 ka hai. Aik bun aur aik juice ka total receipt par kaise dikhaoge?',
        ipo: [
          question('What do you need to start?', ['The prices of both items', 'The final receipt', 'The number of shop assistants'], 0, 'Look at the numbers printed on the shelf.', 'The two item prices are the inputs.'),
          question('What calculation gives the total?', ['80 minus 40', '40 plus 80', '40 times 80'], 1, 'A customer buys both items.', 'Adding combines both prices into the total.'),
          question('What goes on the receipt as the total?', ['Rs 80', 'Rs 40', 'Rs 120'], 2, 'Check what one of each costs together.', 'The receipt tells the customer the full amount due.'),
        ],
        steps: question('When should you show the total?', ['Before reading either price', 'After adding the prices', 'Before adding the juice price'], 1, 'Showing an answer is the last part of the job.', 'You need both prices and the result of adding them before you can show the total.'),
        chart: {
          kind: 'line',
          nodes: [{ text: 'Show the total', shape: 'input' }, { text: 'Add the two prices', shape: 'action' }, { text: 'Get both prices', shape: 'input' }],
          order: [2, 1, 0], hint: 'The receipt can only be shown after its amount is ready.',
        },
        alternate: 'Try one method that adds the shelf prices and one that uses mental math by grouping tens.',
        compare: question('If the shop changes its prices each week, which receipt plan still works?', ['Add the current prices each time', 'Always print Rs 120', 'Always use the old juice price'], 0, 'Choose the plan that uses today’s inputs.', 'A reusable plan adds whatever prices it is given.'),
        code: {
          source: '#include <iostream>\n\nint main() {\n    int bun = 40;\n    int juice = 80;\n    int total = bun + juice;\n    std::cout << total << "\\n";\n}',
          input: '',
          question: question('If you change the juice price to 90, what will the program show?', ['120', '130', '90'], 1, 'Add the bun price to the new juice price.', 'The total uses the current juice price: 40 plus 90 gives 130.'),
        },
        takeaway: 'The program kept each price under a name. A named place for a value is called a variable. The line with cout displays a value. Try changing one price and tracing the result again.',
      },
      {
        id: 'ribbon', title: 'Measure ribbon for a badge',
        story: 'A lab badge needs two pieces of ribbon, each 2.5 cm long. You want to write the total length before you cut. How much ribbon should you mark?',
        urdu: 'Lab badge ke liye do ribbon ke tukray chahiye, har aik 2.5 cm ka. Kaatne se pehle kul lambai kaise nikaloge?',
        ipo: [
          question('What two things do you need?', ['Only the total length', 'The number of pieces and the length of each', 'Only the color of the ribbon'], 1, 'Think of how many pieces you need and how big each one is.', 'The count and the length per piece are the inputs.'),
          question('What work gives the length to mark?', ['Subtract 2 from 2.5', 'Round 2.5 down first', 'Multiply 2.5 by 2'], 2, 'You need the length of two equally long pieces combined.', 'Multiplying the length by the count adds two equal lengths.'),
          question('How much should you mark?', ['5 cm', '4 cm', '2.5 cm'], 0, 'Add 2.5 cm and 2.5 cm to double-check.', 'Two pieces of 2.5 cm need 5 cm of ribbon.'),
        ],
        steps: question('How should you record the length of one piece before working out the total?', ['Write only 2 cm', 'Keep the full 2.5 cm', 'Write only the number of pieces'], 1, 'The half centimeter belongs to every piece.', 'Keeping the fractional part gives the right total.'),
        chart: {
          kind: 'line',
          nodes: [{ text: 'Show how much ribbon to mark', shape: 'input' }, { text: 'Multiply count by length', shape: 'action' }, { text: 'Read the count and length', shape: 'input' }],
          order: [2, 1, 0], hint: 'Collect both numbers before using them. Show the result at the end.',
        },
        alternate: 'Add 2.5 cm twice in one method. Find a different way that also works for ten equal pieces.',
        compare: question('Which is quicker if you need ten pieces of the same length?', ['Count the pieces only', 'Add 2.5 ten times by hand', 'Multiply the length by ten'], 2, 'Think of a single calculation that combines all ten lengths.', 'Multiplication gives the total in one calculation.'),
        code: {
          source: '#include <iostream>\n\nint main() {\n    int pieces = 2;\n    double length = 2.5;\n    std::cout << pieces * length << "\\n";\n}',
          input: '',
          question: question('If you change pieces to 3, what number should be printed?', ['6', '7.5', '8'], 1, 'Use the whole 2.5 for each of the three pieces.', 'Three lengths of 2.5 cm add up to 7.5 cm.'),
        },
        takeaway: 'The count is a whole number, but the length has a fractional part. C++ calls the kind of value a data type. Here int holds the count and double can hold 2.5. The writing rules, like ending a statement with a semicolon, are called syntax.',
      },
    ],
  },
  {
    id: 'decisions', title: 'Make Decisions', tone: 'butter',
    description: 'Choose an action when a rule is true or false.',
    lessons: [
      {
        id: 'entry', title: 'Check lab entry',
        story: 'A lab exercise is open to students who scored at least 50 out of 100 on a safety check. Aimen wants to tell each student whether they can enter. What rule will you use?',
        urdu: 'Safety check mein kam az kam 50 marks walay students lab mein aa sakte hain. Aimen har student ka faisla kaise karein?',
        ipo: [
          question('What do you need for a student?', ['Their seat number', 'Their safety-check score', 'Their year of study'], 1, 'Look at what the rule measures.', 'The safety-check score is the input.'),
          question('How should you check the score?', ['Check whether it is 50 or higher', 'Check whether it is exactly 50', 'Check whether it is lower than 100'], 0, 'The rule says “at least,” so think about what happens at 50 and above.', 'A score of 50 or more meets the rule.'),
          question('What do you tell someone who scored 50?', ['Ask for one extra mark', 'Try again', 'You can enter'], 2, 'Does 50 itself meet “at least 50”?', 'The cutoff includes 50.'),
        ],
        steps: question('Which scores are useful for checking both sides of the cutoff?', ['70 and 80', '49, 50 and 51', '10 and 20'], 1, 'Test one score just below the line, one on it, and one just above it.', 'These three scores check the point where the result changes.'),
        chart: {
          kind: 'branch',
          nodes: [{ text: 'Show “Try again”', shape: 'input' }, { text: 'Show “You can enter”', shape: 'input' }, { text: 'Is the score 50 or higher?', shape: 'choice' }],
          order: [2, 1, 0], branches: ['Yes', 'No'], hint: 'Follow the Yes arrow with a score of exactly 50. What should that student read?',
        },
        alternate: 'One way checks for scores of 50 or more. Another can check for scores below 50 first. Write both with their two results.',
        compare: question('Which plan matches the lab rule in the same order it was stated?', ['Check for 50 or more, then allow entry when that is true', 'Check for exactly 50 and let only those students in', 'Check if the score is bigger than 50'], 0, 'The plan must work for both exactly 50 and anything above it.', 'Checking for 50 or more directly matches the stated rule.'),
        code: {
          source: '#include <iostream>\n\nint main() {\n    int score;\n    std::cin >> score;\n    if (score >= 50) {\n        std::cout << "You can enter\\n";\n    } else {\n        std::cout << "Try again\\n";\n    }\n}',
          input: '50',
          question: question('What will the program show when the input is 49?', ['You can enter', '49', 'Try again'], 2, 'Follow the other path when the score test is false.', '49 is below 50, so the program runs the else part.'),
        },
        takeaway: 'In C++, if runs a block when its check is true. An else block runs when the check is false. Try scores just below, at and above the cutoff to check your rule.',
      },
    ],
  },
  {
    id: 'repetition', title: 'Repeat with Loops', tone: 'lilac',
    description: 'Repeat a job and stop at the right time.',
    lessons: [
      {
        id: 'tickets', title: 'Number lab tickets',
        story: 'Aimen needs five queue tickets for students waiting for a lab check. The tickets need the numbers 1 through 5 in order. How can you make them without skipping a number?',
        urdu: 'Aimen ko lab check ke liye paanch tickets chahiye. Un par 1 se 5 tak number sahi tarteeb mein kaise likhoge?',
        ipo: [
          question('What number tells you when to stop?', ['The first student’s seat number', 'The number on the first ticket only', 'The number of tickets needed'], 2, 'Think of the number that would change if more students joined.', 'The ticket count tells you the last number to print.'),
          question('What do you do for each ticket?', ['Print the current number and go up by one', 'Print 1 every time', 'Skip the numbers in the middle'], 0, 'Each new ticket needs the next number in line.', 'Print the current number, then add one before the next ticket.'),
          question('What should Aimen get?', ['Tickets 0 to 4', 'Tickets 1, 2, 3, 4 and 5', 'One ticket marked 5'], 1, 'Check both the first and the last number requested.', 'The five tickets are numbered from 1 through 5.'),
        ],
        steps: question('What should you do after writing ticket number 5?', ['Write ticket 6', 'Start again at 1', 'Stop making tickets'], 2, 'Check how many tickets you have at that point.', 'You already have all five tickets after printing 5.'),
        chart: {
          kind: 'loop',
          nodes: [{ text: 'Put the tickets out', shape: 'input' }, { text: 'Write the number and add one', shape: 'action' }, { text: 'Start the count at one', shape: 'action' }, { text: 'Is the number at most the ticket count?', shape: 'choice' }],
          order: [2, 3, 1, 0], branches: ['Yes', 'No'], hint: 'After printing a ticket, go back to the check. Which box belongs on that return path?',
        },
        alternate: 'You can list five separate instructions or repeat one instruction with a changing number. Write out both plans.',
        compare: question('Which method is easier to change if twenty students show up?', ['Repeat one instruction until the ticket count is reached', 'Write twenty instructions by hand', 'Use five tickets for all twenty people'], 0, 'Which plan can change just one number when the class gets bigger?', 'A repeated instruction only needs a new ticket count.'),
        code: {
          source: '#include <iostream>\n\nint main() {\n    int tickets;\n    std::cin >> tickets;\n    int number = 1;\n    while (number <= tickets) {\n        std::cout << number << "\\n";\n        number = number + 1;\n    }\n}',
          input: '5',
          question: question('If the input is 3, what will be printed in order?', ['0, 1, 2', '1, 2, 3', '1, 2, 3, 4'], 1, 'Start at 1 and check the rule before printing each number.', 'The loop prints 1, 2 and 3, then stops when number reaches 4.'),
        },
        takeaway: 'A loop repeats a set of steps. In C++, while checks its rule before each round. Find a starting value, an action that moves the count forward, and a clear stopping point.',
      },
    ],
  },
];

export const curriculum = modules.flatMap(module => module.lessons.map(lesson => ({ module, lesson })));
export const stagesFor = (lesson: Lesson): Stage[] =>
  lesson.code ? ['ipo', 'steps', 'chart', 'compare', 'code'] : ['ipo', 'steps', 'chart', 'compare'];
export const maximumScore = curriculum.reduce((sum, { lesson }) => sum + stagesFor(lesson).length, 0);
