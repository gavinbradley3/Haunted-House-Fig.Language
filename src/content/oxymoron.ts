/**
 * All instructional content for the Ballroom of Contradictions (OXYMORON).
 * Teachers can edit wording here without touching any game code.
 */
import { place, type AnnotatedPart, type ChoiceOption, type LessonContent } from './types';

type Kind = 'oxy' | 'opp' | 'none';
const KIND_TEXT: Record<Kind, string> = { oxy: 'Oxymoron', opp: 'Ordinary opposites', none: 'No contradiction' };

/** Sort a phrase into one of the three kinds. */
function sort(kind: Kind, why: string, notes: Partial<Record<Kind, string>>): ChoiceOption[] {
  const fallback: Record<Kind, string> = {
    oxy: 'An oxymoron joins two contradictory words into ONE idea. That is not what this phrase does.',
    opp: 'Ordinary opposites are two separate things listed side by side (“hot and cold”). That is not what this phrase does.',
    none: 'There IS a contradiction here: the two words pull against each other.',
  };
  return (['oxy', 'opp', 'none'] as Kind[]).map((k, i) => ({
    id: k,
    letter: 'OAN'[i],
    text: KIND_TEXT[k],
    correct: k === kind,
    verdict: k === kind ? KIND_TEXT[k] : `Not ${KIND_TEXT[k].toLowerCase()}`,
    explanation: k === kind ? why : (notes[k] ?? fallback[k]),
  }));
}

/** Choose the word that makes the phrase an oxymoron. */
function complete(right: string, why: string, others: [string, string][], pos: number): ChoiceOption[] {
  return place(
    [
      { id: right, letter: 'A', text: right, correct: true, verdict: 'An oxymoron', explanation: why },
      ...others.map(([w, e]) => ({ id: w, letter: 'A', text: w, correct: false, verdict: 'No contradiction', explanation: e })),
    ],
    pos,
  );
}

export const OXYMORON = {
  id: 'ballroom',
  device: 'Oxymoron',
  room: 'The Ballroom of Contradictions',
  roleLabels: {
    subject: 'What is described',
    word: 'One idea',
    compared: 'Its contradiction',
  },
  proveNoun: 'sentence',
  proveButton: 'Write it on the dance card',
  requireMastery: true,

  discover: {
    kicker: 'Discover',
    title: 'The Last Waltz',
    intro: 'A waltz is still playing in the empty ballroom. Reveal each description, then listen, and watch the dancers.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The ballroom was very quiet.',
    descriptionB: 'The ballroom was filled with a deafening silence.',
    askB: 'Can silence really be deafening? What happened to the music?',
    questions: [
      'Which two words in description B seem to contradict each other?',
      'How can a silence feel “deafening”?',
      'Which description makes the ballroom feel stranger? Why?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Oxymoron',
        term: 'OXYMORON',
        body: 'An oxymoron puts two words that seem to [contradict] each other side by side, to describe *one* thing: deafening silence, frozen fire.',
      },
      {
        id: 'why',
        title: 'Why writers use oxymorons',
        tryIt: 'Think of a silence so complete that it almost hurts your ears. Now say “deafening silence”. Does the contradiction fit the feeling?',
        body: 'An oxymoron makes the reader stop and think. It can show feelings that are mixed or conflicting, or describe something so strange that ordinary words will not do.',
      },
      {
        id: 'annotate',
        title: 'Take the phrase apart',
        parts: [
          { text: 'The candles', role: 'subject' },
          { text: ' burned with a ' },
          { text: 'frozen', role: 'word' },
          { text: ' ' },
          { text: 'fire', role: 'compared' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Look at the candles on the stands. How can fire be frozen?',
        effect: 'Fire is hot and frozen things are cold, so the words fight each other. Together they describe a cold, unnatural flame: just what a haunted ballroom would have.',
      },
      {
        id: 'example2',
        title: 'Oxymorons can show mixed feelings',
        parts: [
          { text: 'Their last dance', role: 'subject' },
          { text: ' was a ' },
          { text: 'sweet', role: 'word' },
          { text: ' ' },
          { text: 'sorrow', role: 'compared' },
          { text: '.' },
        ] as AnnotatedPart[],
        effect: 'The dance was happy and sad at the same time: sweet because they danced together, sorrowful because it was the last time. Two opposite feelings in one moment.',
      },
      {
        id: 'nonExample',
        title: 'Careful: two kinds of near miss',
        sentence: 'The ballroom was hot and cold.',
        verdict: 'NOT an oxymoron',
        body: '“Hot and cold” lists two ordinary opposites as separate things. An oxymoron joins two contradictory words into ONE idea. And a pair with no contradiction at all, like “quiet whisper”, is not an oxymoron either: whispers are supposed to be quiet.',
        check: ['Are the two words joined into one idea?  No, they are listed.', '“Quiet whisper”: is there a contradiction?  No, whispers are quiet.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Sort the Ballroom',
    prompt: 'Dance cards are scattered across the floor. Sort each phrase: an oxymoron, ordinary opposites, or no contradiction at all. Each oxymoron you find appears somewhere in the ballroom.',
    discussion: 'Ask two questions: do the words contradict each other? Are they joined into one idea?',
    retryHint: 'Ask: do they contradict? Are they joined into one idea, or just listed?',
    options: [],
    items: [
      {
        id: 'fire',
        source: 'Dance card I',
        text: 'frozen fire',
        options: sort('oxy', 'Fire is hot; frozen is cold. Two contradictory words joined into one idea: an oxymoron.', {
          opp: 'They are opposites, but they are not listed as two separate things: “frozen” describes the fire. That makes it an oxymoron.',
        }),
      },
      {
        id: 'blackwhite',
        source: 'Dance card II',
        text: 'black and white',
        options: sort('opp', 'Black and white are ordinary opposites, listed side by side as two separate things. Not an oxymoron.', {
          oxy: 'They are opposites, but they are listed with “and”, not joined into one contradictory idea.',
        }),
      },
      {
        id: 'secret',
        source: 'Dance card III',
        text: 'an open secret',
        options: sort('oxy', 'A secret is hidden; open means not hidden. An “open secret” is something everybody knows but nobody says: an oxymoron.', {
          none: 'There is a contradiction: secrets are hidden, but this one is open.',
        }),
      },
      {
        id: 'whisper',
        source: 'Dance card IV',
        text: 'a quiet whisper',
        options: sort('none', 'Whispers are supposed to be quiet, so the words agree. No contradiction, no oxymoron.', {
          oxy: 'Do the words contradict each other? Whispers ARE quiet, so they agree.',
        }),
      },
      {
        id: 'silence',
        source: 'Dance card V',
        text: 'deafening silence',
        options: sort('oxy', 'Silence makes no sound; deafening means so loud it hurts. Joined into one idea: an oxymoron.', {}),
      },
      {
        id: 'updown',
        source: 'Dance card VI',
        text: 'up and down',
        options: sort('opp', 'Up and down are ordinary opposites listed together, describing two separate directions. Not an oxymoron.', {
          oxy: 'They are opposites, but they are listed with “and” as two directions, not joined into one idea.',
        }),
      },
    ],
    takeaway: 'The frozen fire, the silent dancers and the open secret are all in the room now. Each oxymoron joins a contradiction into one strange thing.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Complete the Contradiction',
    prompt: 'Each phrase is missing a word. Choose the word that turns it into an oxymoron.',
    discussion: 'Which word fights against the other word?',
    retryHint: 'Find the word that contradicts the other word.',
    options: [],
    items: [
      {
        id: 'crowd',
        text: 'The dancers were a ___ crowd.',
        options: complete(
          'lonely',
          'A crowd is full of people, yet “lonely” means alone. A lonely crowd: people together who still feel alone. An oxymoron.',
          [
            ['noisy', 'Crowds are often noisy, so the words agree. No contradiction.'],
            ['large', 'Crowds are large; the words agree. No contradiction.'],
          ],
          1,
        ),
      },
      {
        id: 'scream',
        text: 'From the balcony came a ___ scream.',
        options: complete(
          'silent',
          'A scream is loud, and silent means no sound at all. A silent scream: a scream of fear with no sound. An oxymoron.',
          [
            ['loud', 'Screams are loud, so the words agree. No contradiction.'],
            ['sudden', 'A sudden scream is frightening, but nothing contradicts.'],
          ],
          2,
        ),
      },
      {
        id: 'waltz',
        text: 'The dress forms danced a ___ waltz.',
        options: complete(
          'still',
          'A waltz is a moving dance; still means not moving. A still waltz: dancers who seem to dance without moving. An oxymoron.',
          [
            ['slow', 'A slow waltz is ordinary: slow does not contradict dancing.'],
            ['graceful', 'Waltzes are graceful, so the words agree. No contradiction.'],
          ],
          0,
        ),
      },
    ],
    takeaway: 'The right word always fights the other word, and the fight creates one strange new idea.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Last Dance Card',
    baseSentence: 'The ballroom was empty.',
    task: 'Describe the ballroom in one sentence that uses an oxymoron. Join two contradictory words into one idea that makes the ballroom feel strange.',
    starters: ['The ballroom was filled with…', 'The dancers moved in a…', 'A … … hung over the floor.'],
    criteria: ['Joins two contradictory words', 'The pair describes ONE thing (not two opposites listed)', 'Makes the ballroom feel strange or unsettling'],
    questions: ['Which two words contradict each other?', 'What single thing do they describe together?', 'How does it change the way we see the ballroom?'],
    model: 'Two dress forms danced a still waltz through the crowded emptiness of the ballroom.',
    modelParts: [
      { text: 'Two dress forms danced a ' },
      { text: 'still', role: 'word' },
      { text: ' ' },
      { text: 'waltz', role: 'compared' },
      { text: ' through the ' },
      { text: 'crowded', role: 'word' },
      { text: ' ' },
      { text: 'emptiness', role: 'compared' },
      { text: ' of the ballroom.' },
    ] as AnnotatedPart[],
    modelExplanation: 'Two oxymorons: a waltz that does not move, and an emptiness that feels crowded, as if invisible guests still fill the room.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Music Stops',
    inscription: 'Hold two opposites together, and something new appears.',
    summary: [
      'An oxymoron joins two contradictory words into one idea: deafening silence, frozen fire.',
      'Ordinary opposites listed together (“black and white”) are not an oxymoron.',
      'Words that agree (“quiet whisper”) are not an oxymoron.',
      'Oxymorons show mixed feelings or strange, impossible things.',
    ],
    nextHint: 'The glass case of the open secret has opened. Inside, on a velvet cushion, is a small silver key.',
  },
} satisfies LessonContent;
