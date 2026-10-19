/**
 * All instructional content for the Crooked Kitchen (IDIOM).
 * Teachers can edit wording here without touching any game code.
 * Every idiom used in the challenges is taught on the "kitchen's idioms" card first.
 */
import { place, type AnnotatedPart, type ChoiceOption, type LessonContent } from './types';

/** The real meaning, the word-for-word reading, and a near miss. */
function meaning(right: string, literal: string, near: string, why: string, nearWhy: string, pos: number): ChoiceOption[] {
  return place([
    { id: 'a', letter: 'A', text: literal, correct: false, verdict: 'The literal reading', explanation: `That is what the words say, but not what they mean. ${why}` },
    { id: 'b', letter: 'B', text: right, correct: true, verdict: 'The idiom’s meaning', explanation: why },
    { id: 'c', letter: 'C', text: near, correct: false, verdict: 'Not quite', explanation: nearWhy },
  ], pos);
}

/** Literal or idiom, for the same words in a particular context. */
function context(isIdiom: boolean, why: string): ChoiceOption[] {
  return [
    { id: 'lit', letter: 'L', text: 'Literal: it really happened', correct: !isIdiom, verdict: isIdiom ? 'Look at the context again' : 'Literal', explanation: isIdiom ? `Nothing in the sentence really happened that way. ${why}` : why },
    { id: 'idi', letter: 'I', text: 'Idiom: it means something else', correct: isIdiom, verdict: isIdiom ? 'Idiom' : 'Look at the context again', explanation: isIdiom ? why : `Here the words describe what actually happened. ${why}` },
  ];
}

export const IDIOM = {
  id: 'kitchen',
  device: 'Idiom',
  room: 'The Crooked Kitchen',
  roleLabels: {
    subject: 'Who or what it is about',
    word: 'The idiom',
    compared: '',
  },
  proveNoun: 'sentence',
  proveButton: 'Chalk it on the board',
  requireMastery: true,

  discover: {
    kicker: 'Discover',
    title: 'Nothing Here Means What It Says',
    intro: 'In this kitchen, words come true. Reveal each description and watch the sack by the door.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'Mrs. Hale told everyone the secret.',
    descriptionB: 'Mrs. Hale spilled the beans.',
    askB: 'Did Mrs. Hale really drop any beans? So what does this sentence mean?',
    questions: [
      'What does “spilled the beans” really mean here?',
      'Could you work that out from the words “spill” and “beans”? How do you know what it means?',
      'Why is the kitchen funny, and a little strange, when the words come true?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Idiom',
        term: 'IDIOM',
        body: 'An idiom is a common [expression] whose meaning is *different* from the meanings of its words. You cannot work it out word by word: you have to know it, or use the context.',
      },
      {
        id: 'why',
        title: 'Why idioms are tricky, and useful',
        tryIt: 'If someone says the test was “a piece of cake”, did anybody eat a cake?',
        body: 'Idioms are everywhere in everyday speech. They make language lively and friendly, but they belong to a language and a culture, so someone new to English may take them literally. When you meet one, read the sentence around it for clues.',
      },
      {
        id: 'compare',
        title: 'The kitchen’s idioms',
        rows: [
          { label: 'Spill the beans = tell a secret', parts: [{ text: 'spill the beans', role: 'word' }] },
          { label: 'In hot water = in trouble', parts: [{ text: 'in hot water', role: 'word' }] },
          { label: 'A piece of cake = very easy', parts: [{ text: 'a piece of cake', role: 'word' }] },
          { label: 'Under the weather = feeling ill', parts: [{ text: 'under the weather', role: 'word' }] },
          { label: 'Break the ice = help people relax and start talking', parts: [{ text: 'break the ice', role: 'word' }] },
        ],
        body: 'Look around the kitchen: each of these idioms has come true, word for word. That is what makes them funny here, and it shows why taking an idiom literally gets the meaning wrong.',
      },
      {
        id: 'annotate',
        title: 'Read an idiom in context',
        parts: [
          { text: 'After the pie burned, ' },
          { text: 'the cook', role: 'subject' },
          { text: ' was ' },
          { text: 'in hot water', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Is the cook sitting in a pot? What clue tells you what it means?',
        effect: 'The clue is “after the pie burned”: something has gone wrong. “In hot water” means in trouble. The cook is not wet at all.',
      },
      {
        id: 'nonExample',
        title: 'Careful: the same words can be literal',
        sentence: 'The cook boiled the beans in hot water.',
        verdict: 'NOT an idiom',
        body: 'Here the beans really are in really hot water. The words mean exactly what they say, so this is literal. Context tells you which kind of sentence you are reading.',
        check: ['Do the words mean exactly what they say?  Yes.', 'Is there a hidden, different meaning?  No. So it is literal.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'What Does It Really Mean?',
    prompt: 'Each sentence uses one of the kitchen’s idioms. Choose what it really means, not what the words say. Each one you get right chalks its meaning above its scene.',
    discussion: 'Use the idiom card and the clues in the sentence.',
    retryHint: 'Find the clue in the rest of the sentence.',
    options: [],
    items: [
      {
        id: 'cake',
        source: 'Above the cake',
        text: 'Don’t worry about the spelling test. It will be a piece of cake.',
        options: meaning('It will be very easy.', 'Everyone will get cake after the test.', 'It will be very short.', '“A piece of cake” means very easy. The clue is “don’t worry”.', 'Short is close, but the idiom is about how EASY something is, not how long it takes.', 2),
      },
      {
        id: 'beans',
        source: 'Above the spilled sack',
        text: 'Tom spilled the beans about the hidden door.',
        options: meaning('He told people the secret.', 'He dropped a tin of beans near the door.', 'He was clumsy near the door.', '“Spill the beans” means tell a secret. The clue is “about the hidden door”: a secret.', 'Being clumsy is about spilling things literally. The idiom means telling something that was meant to stay secret.', 0),
      },
      {
        id: 'weather',
        source: 'Above the chair with the cloud',
        text: 'Jun is under the weather, so he stayed home from school.',
        options: meaning('He is feeling ill.', 'He is standing outside in the rain.', 'He is upset about the weather.', '“Under the weather” means feeling ill. The clue is that he stayed home from school.', 'It is not about the weather at all. The idiom means he is not well.', 1),
      },
      {
        id: 'water',
        source: 'Above the steaming pot',
        text: 'The cook was in hot water after the pie burned.',
        options: meaning('She was in trouble.', 'She was sitting in a pot of hot water.', 'She was very warm from the oven.', '“In hot water” means in trouble. The burned pie is the clue.', 'Being warm is a literal idea. The idiom is about being in trouble.', 0),
      },
      {
        id: 'ice',
        source: 'Above the cracked block of ice',
        text: 'On the first day, a funny story helped break the ice.',
        options: meaning('It helped everyone relax and start talking.', 'It cracked a block of ice.', 'It made the room colder.', '“Break the ice” means help people who feel awkward relax and start talking. The clue is “on the first day”.', 'A colder room is a literal idea. The idiom is about the awkward “frozen” feeling between people who have just met.', 2),
      },
    ],
    takeaway: 'Each idiom’s real meaning is now written above the scene that took it literally. Idioms mean something different from their words.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Literal or Idiom?',
    prompt: 'The same words can be an idiom in one sentence and literal in another. Read each sentence and decide which it is.',
    discussion: 'Could this really have happened? What does the rest of the sentence tell you?',
    retryHint: 'Read the whole sentence again. Could it really have happened?',
    options: [],
    items: [
      {
        id: 'jar',
        text: 'I knocked the jar off the shelf and spilled the beans all over the floor.',
        options: context(false, 'There really is a jar, and beans really are on the floor. The words mean exactly what they say.'),
      },
      {
        id: 'party',
        text: 'Now everyone knows about the surprise party. Somebody spilled the beans.',
        options: context(true, 'No beans are involved: somebody told the secret. The clue is “now everyone knows”.'),
      },
      {
        id: 'pond',
        text: 'The skaters had to break the ice on the pond before they could fish.',
        options: context(false, 'The skaters really do break real ice on a real pond to fish through it. Literal.'),
      },
      {
        id: 'school',
        text: 'At her new school, Maya told a joke to break the ice.',
        options: context(true, 'There is no ice at school: Maya helped people relax and start talking. Idiom.'),
      },
    ],
    takeaway: 'The words do not tell you whether a phrase is an idiom. The context does.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Kitchen Slate',
    baseSentence: 'Everyone was nervous about opening the locked door.',
    task: 'Write a sentence about the house that uses ONE of the kitchen’s idioms correctly. The rest of the sentence should make its real meaning clear.',
    starters: ['Opening the door was not…', 'If we get caught, we will be…', 'Somebody has to…'],
    criteria: ['Uses one of the kitchen’s idioms', 'Uses it with its real (not literal) meaning', 'The context makes the meaning clear'],
    questions: ['Which idiom did you use?', 'What does it really mean?', 'Which words in your sentence are the clue?'],
    model: 'Opening the locked door was not a piece of cake, and if the caretaker found us we would be in hot water.',
    modelParts: [
      { text: 'Opening the locked door was not ' },
      { text: 'a piece of cake', role: 'word' },
      { text: ', and if the caretaker found us ' },
      { text: 'we', role: 'subject' },
      { text: ' would be ' },
      { text: 'in hot water', role: 'word' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation: '“Not a piece of cake” means it was not easy; “in hot water” means in trouble. The caretaker finding us is the clue that makes the second one clear.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Kitchen Straightens',
    inscription: 'Never take a word at its word.',
    summary: [
      'An idiom is a common expression whose meaning is different from its words.',
      'You learn idioms, or work them out from context; you cannot decode them word by word.',
      'The same words can be literal in one sentence and an idiom in another.',
      'Spill the beans, in hot water, a piece of cake, under the weather, break the ice.',
    ],
    nextHint: 'The pantry door has creaked open by itself, and the sack of beans is somehow full again. On the table, beside the cake, a key has appeared.',
  },
} satisfies LessonContent;
