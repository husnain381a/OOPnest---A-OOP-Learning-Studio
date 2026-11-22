import { calculationResults } from '../supabase/functions/_shared/curriculum.ts';
import { simulateCout } from '../supabase/functions/_shared/cout.ts';

export const firstChai = 'Measure pani and milk\nHeat the liquid\nAdd loose leaves and sugar\nStrain the chai into a cup';
export const secondChai = 'Measure water and milk\nHeat the water\nSteep a tea bag in a cup\nAdd milk and sugar and serve';

const reasons = {
  chai: 'A tea bag works without a strainer.', lemon: 'Mixing in one jug gives both glasses the same taste.',
  lock: 'Matching the label saves time.', canteen: 'The ready snack fits the time limit.',
  break: 'The food counter will close soon.', battery: 'No charger is available, so use battery saver.',
  rain: 'The bus takes too many minutes.', room: 'Both people can sweep the whole floor at once.',
  bag: 'The checklist includes the extra item.', water: 'The next-floor cooler is working.',
  'better-way': 'The sandwich is ready, so I can reach class on time.',
};

const code = [
  'cout << "Salaam";', String.raw`cout << "Ready\nGo";`, String.raw`cout << "Sara\t07";`,
  String.raw`cout << "\"Saved\" \\" << "\a";`, String.raw`cout << "Name\tSara\nClass\tBS CS\nLike\tChai";`,
];

export function answerFor(lesson, stage) {
  switch (stage) {
    case 'ipo': return [2, 0, 1];
    case 'steps': return lesson.steps.map((_, index) => index);
    case 'write': return lesson.id === 'chai' ? firstChai : lesson.steps.join('\n');
    case 'flow': return { shapes: Object.fromEntries(lesson.flow.cards.map(card => [card.id, card.shape])), edges: lesson.flow.edges };
    case 'compare': case 'quiz': return { choice: lesson.comparison.better, reason: reasons[lesson.id], ...(lesson.id === 'chai' ? { second: secondChai } : {}) };
    case 'pseudo': return `${lesson.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')} ${calculationResults[lesson.id].join(' and ')}`;
    case 'predict': {
      const result = simulateCout(lesson.sample, lesson.lesson);
      return { text: result.output, beep: result.beeps > 0 };
    }
    case 'code': return code[lesson.lesson - 1];
  }
}
