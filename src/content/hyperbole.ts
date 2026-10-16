/**
 * All instructional content for the Giant's Dining Room (HYPERBOLE).
 * Teachers can edit wording here without touching any game code.
 */
import type { AnnotatedPart, ChoiceOption, LessonContent } from './types';

/** A Hyperbole / Literal pair of options for one place card. */
function sortOptions(hyperbole: boolean, why: string, ifWrong: string): ChoiceOption[] {
  return [
    {
      id: 'h',
      letter: 'H',
      text: 'Hyperbole',
      correct: hyperbole,
      verdict: hyperbole ? 'Hyperbole' : 'Not a hyperbole',
      explanation: hyperbole ? why : ifWrong,
    },
    {
      id: 'l',
      letter: 'L',
      text: 'Literal',
      correct: !hyperbole,
      verdict: hyperbole ? 'Not literal' : 'Literal: it could really be true',
      explanation: hyperbole ? ifWrong : why,
    },
  ];
}

export const HYPERBOLE = {
  id: 'dining',
  device: 'Hyperbole',
  room: "The Giant's Dining Room",
  roleLabels: {
    subject: 'What is being described',
    word: 'The exaggeration',
    compared: 'What it really means',
  },
  proveNoun: 'hyperbole',
  proveButton: 'Chalk it on the menu',

  discover: {
    kicker: 'Discover',
    title: 'A Very Large Appetite',
    intro: 'Somebody very big ate here. Reveal each description of the giant and watch the table.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The giant was very hungry.',
    descriptionB: 'The giant was so hungry he ate the table, then asked for the chairs.',
    askB: 'Did the giant really eat the table? Then why say it?',
    questions: [
      'Which description tells you more about how hungry the giant was?',
      'Is description B true? Does it matter that it is not true?',
      'What happened to the dishes when you read description B?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Hyperbole',
        term: 'HYPERBOLE',
        body: 'A hyperbole (say *hy-PER-bo-lee*) is a [deliberate exaggeration] that is *not meant to be taken literally*. It makes something sound far bigger, smaller, worse or better than it really is.',
      },
      {
        id: 'why',
        title: 'Why writers exaggerate',
        tryIt: 'Compare “I have a lot of homework” with “I have so much homework I will finish it when I am ninety.” Which one shows how you feel?',
        body: 'Nobody believes a hyperbole, and that is the point. The exaggeration shows how strongly someone feels, makes us laugh, or makes something seem enormous or frightening. It adds emphasis.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'The giant', role: 'subject' },
          { text: ' ate ' },
          { text: 'enough bread to fill a cathedral', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Could anyone really eat that much bread? What is the writer telling us?',
        effect: 'No one could eat that much, so we know the writer is exaggerating on purpose. The picture of a cathedral full of bread tells us the giant’s hunger is enormous, almost frightening.',
      },
      {
        id: 'example2',
        title: 'Hyperbole is everywhere',
        parts: [
          { text: 'I’ve told you', role: 'subject' },
          { text: ' ' },
          { text: 'a million times', role: 'word' },
          { text: '!' },
        ] as AnnotatedPart[],
        effect: 'Nobody counted to a million. The speaker means “I have told you many times, and I am frustrated.” We use hyperbole in everyday talk all the time.',
      },
      {
        id: 'nonExample',
        title: 'Careful: big is not the same as exaggerated',
        sentence: 'The giant’s table was nine metres long.',
        verdict: 'NOT a hyperbole',
        body: 'Nine metres is very long, but it could be measured and found true. A hyperbole is an exaggeration beyond the truth that nobody is supposed to believe.',
        check: ['Exaggerated beyond what is possible or true?  No. It is a real measurement.', 'Meant to be taken literally?  Yes. So it is literal.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'The Giant’s Place Cards',
    prompt: 'Each guest left a remark on their place card. Sort each one: hyperbole, or literal? Hyperboles make their dish grow.',
    discussion: 'Ask: could this really be true? If it could not, is the writer exaggerating on purpose?',
    retryHint: 'Look again: could it really, actually be true?',
    options: [],
    items: [
      {
        id: 'soup',
        source: 'Card I, by the soup tureen',
        text: 'I’ve waited a hundred years for this soup!',
        options: sortOptions(
          true,
          'Nobody waits a hundred years for soup. The exaggeration shows how impatient and hungry the guest is.',
          'Could someone really wait a hundred years for a bowl of soup? This is an exaggeration to show impatience, so it is a hyperbole.',
        ),
      },
      {
        id: 'table',
        source: 'Card II, at the head of the guests’ table',
        text: 'This table seats twenty-four guests.',
        options: sortOptions(
          false,
          'A big number, but a table really can seat twenty-four people. It is a fact, so it is literal.',
          'Twenty-four is a lot of guests, but a long table really can seat them. Big numbers are not hyperbole unless they go beyond the truth.',
        ),
      },
      {
        id: 'pie',
        source: 'Card III, by the pie',
        text: 'This pie is so big it has its own weather.',
        options: sortOptions(
          true,
          'No pie has weather. The impossible detail tells us the pie is gigantic.',
          'A pie with its own weather is impossible. The writer is exaggerating its size on purpose, so it is a hyperbole.',
        ),
      },
      {
        id: 'candles',
        source: 'Card IV, by the candelabrum',
        text: 'The candles have been burning for three hours.',
        options: sortOptions(
          false,
          'Candles really can burn for three hours. Nothing is exaggerated, so it is literal.',
          'Three hours is a real, possible length of time for candles to burn. There is no exaggeration here.',
        ),
      },
      {
        id: 'laugh',
        source: 'Card V, by the giant’s goblet',
        text: 'The giant’s laugh shook every window in the county.',
        options: sortOptions(
          true,
          'One laugh could not shake a whole county’s windows. The exaggeration makes the giant’s voice sound huge and a little frightening.',
          'Every window in the county? That is far beyond what a laugh could do. It is an exaggeration, so it is a hyperbole.',
        ),
      },
      {
        id: 'salt',
        source: 'Card VI, by the salt cellar',
        text: 'The salt cellar is made of silver.',
        options: sortOptions(
          false,
          'A silver salt cellar is ordinary in a grand house. It is a plain fact, so it is literal.',
          'Silver salt cellars really exist, and nothing is exaggerated. This one is literal.',
        ),
      },
    ],
    takeaway: 'Look at the table. Only the exaggerations grew. A hyperbole makes something bigger than the truth; a literal sentence leaves it the size it really is.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Exaggerate with a Purpose',
    prompt: 'Make the plain sentence more powerful. Which hyperbole makes the giant feel frightening, not funny? Select each option and watch the room.',
    baseSentence: 'The giant was hungry.',
    discussion: 'Which version would make you want to leave the dining room? Why?',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'The giant was so hungry he could eat a horse.',
        correct: false,
        verdict: 'A hyperbole, but a worn-out one',
        explanation: 'It is an exaggeration, so it is a hyperbole. But people say it so often that it sounds ordinary, even funny. It does not make the giant frightening.',
        effect: 'rattle',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The giant was very, very hungry.',
        correct: false,
        verdict: 'Not a hyperbole',
        explanation: 'Adding “very” makes it stronger, but it could still be true. Nothing is exaggerated beyond what is possible.',
        effect: 'none',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The giant was so hungry he could have swallowed this whole house, chimneys and all.',
        correct: true,
        verdict: 'The strongest choice',
        explanation: 'Swallowing a house is impossible, so it is a hyperbole. And we are standing inside that house. The exaggeration makes the giant’s hunger feel huge and dangerous to us.',
        effect: 'loom',
      },
      {
        id: 'd',
        letter: 'D',
        text: 'The giant was as hungry as a wolf.',
        correct: false,
        verdict: 'A simile, not a hyperbole',
        explanation: 'It compares the giant to a wolf using “as … as.” That is a simile. A wolf can be very hungry, so nothing is exaggerated beyond the truth.',
        effect: 'shiver',
      },
    ],
    takeaway: 'A good hyperbole is not just big; it is chosen for an effect. Option C points the giant’s hunger at the very room we are standing in.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Giant’s Menu',
    baseSentence: 'The soup was hot.',
    task: 'With a partner, rewrite this sentence as a hyperbole. Exaggerate so far that nobody could believe it, and choose your exaggeration for an effect: funny, amazing or frightening.',
    starters: ['The soup was so hot that…', 'One spoonful of that soup…', 'The steam from the soup…'],
    criteria: ['Exaggerates far beyond the truth', 'Is clearly not meant to be taken literally', 'The exaggeration creates an effect (funny, amazing or frightening)'],
    questions: ['What is being exaggerated?', 'How do you know it is not meant literally?', 'What effect does the exaggeration create?'],
    model: 'The soup was so hot that the spoon melted before it reached the giant’s mouth.',
    modelParts: [
      { text: 'The soup', role: 'subject' },
      { text: ' was so hot that ' },
      { text: 'the spoon melted before it reached the giant’s mouth', role: 'word' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation: 'Soup cannot melt a metal spoon, so we know it is an exaggeration. The impossible picture makes the heat feel extreme, and a little funny.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Giant Is Satisfied',
    inscription: 'Say it bigger than the truth, and the truth is felt.',
    summary: [
      'A hyperbole is a deliberate exaggeration that is not meant to be taken literally.',
      'Big but true is not hyperbole: “The table seats twenty-four” is literal.',
      'Writers exaggerate on purpose: for emphasis, humour or fear.',
      'Choose an exaggeration for its effect, not just its size.',
    ],
    nextHint: 'The giant’s silver cloche has lifted. On a plate a metre wide lies the smallest key you have ever seen.',
  },
} satisfies LessonContent;
