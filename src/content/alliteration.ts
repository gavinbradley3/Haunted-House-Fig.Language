/**
 * All instructional content for the Whispering Press (ALLITERATION).
 * Teachers can edit wording here without touching any game code.
 */
import type { AnnotatedPart, ChoiceOption, LessonContent } from './types';

/** Alliteration or not, for one pair of words. */
function judge(yes: boolean, why: string, ifWrong: string): ChoiceOption[] {
  return [
    { id: 'y', letter: 'A', text: 'Alliteration', correct: yes, verdict: yes ? 'Alliteration' : 'Not alliteration', explanation: yes ? why : ifWrong },
    { id: 'n', letter: 'N', text: 'Not alliteration', correct: !yes, verdict: yes ? 'Look again: it IS alliteration' : 'Correct: not alliteration', explanation: yes ? ifWrong : why },
  ];
}

export const ALLITERATION = {
  id: 'press',
  device: 'Alliteration',
  room: 'The Whispering Press',
  roleLabels: {
    subject: 'What is described',
    word: 'Repeated beginning sound',
    compared: '',
  },
  proveNoun: 'sentence',
  proveButton: 'Print it',
  requireMastery: true,

  discover: {
    kicker: 'Discover',
    title: 'The Press That Whispers',
    intro: 'The old press has started printing by itself. Reveal each description and listen to the rhythm of the words.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The printer worked at night.',
    descriptionB: 'The patient printer pressed pages past midnight.',
    askB: 'Say it quietly to yourself. Which sound keeps coming back?',
    questions: [
      'Which beginning sound repeats in description B?',
      'How does the repeated sound make the sentence feel?',
      'Did you notice the press thumping in time with the words?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Alliteration',
        term: 'ALLITERATION',
        body: 'Alliteration is the repetition of the same [beginning consonant sound] in words that are close together. *Patient printer pressed pages.*',
      },
      {
        id: 'why',
        title: 'Why writers use it',
        tryIt: 'Say “Silent spirits slipped softly” and then “Big black boots banged”. Which one whispers? Which one stamps?',
        body: 'Repeated sounds give writing rhythm and make it easy to remember. The sound itself can set a mood: soft “s” sounds whisper and hiss, hard “b”, “k” and “p” sounds bang and clatter.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'Cold', role: 'word' },
          { text: ' ' },
          { text: 'keys', role: 'word' },
          { text: ' ' },
          { text: 'clattered', role: 'word' },
          { text: ' in the ' },
          { text: 'cupboard', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Which sound repeats? Is it always spelled the same way?',
        effect: 'The hard “k” sound repeats four times, spelled both “c” and “k”. It sounds like metal keys knocking together.',
      },
      {
        id: 'compare',
        title: 'Listen, don’t look: sound, not spelling',
        rows: [
          { label: 'Same sound, different letters: alliteration', parts: [{ text: 'Phantom', role: 'word' }, { text: ' ' }, { text: 'fog', role: 'word' }] },
          { label: 'Same letter, different sounds: NOT alliteration', parts: [{ text: 'Cold', role: 'subject' }, { text: ' ' }, { text: 'ceiling', role: 'subject' }] },
          { label: 'Silent letter: “knock” begins with an “n” sound', parts: [{ text: 'Knock', role: 'word' }, { text: ' ' }, { text: 'now', role: 'word' }] },
        ],
        body: '“Ph” and “f” make the same sound, so *phantom fog* alliterates. “C” sounds like “k” in *cold* but like “s” in *ceiling*, so *cold ceiling* does not. Say the words aloud and listen.',
      },
      {
        id: 'nonExample',
        title: 'Careful: words must be close, and must share a sound',
        sentence: 'The printer used ink and paper.',
        verdict: 'NOT alliteration',
        body: 'No beginning sound repeats in nearby words. And one repeated letter far apart in a long sentence is not alliteration either: the repeated sounds should be close enough to hear.',
        check: ['Do nearby words begin with the same consonant sound?  No.', 'Printer, used, ink, paper: four different beginning sounds.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Sound or Spelling?',
    prompt: 'The press has set six pairs of words. For each pair, decide: alliteration or not? Say the words quietly to yourself. Sounds, not letters, decide.',
    discussion: 'Say both words quietly to yourself. Do they BEGIN with the same sound?',
    retryHint: 'Say the two words quietly to yourself and listen to the very first sound of each.',
    options: [],
    items: [
      {
        id: 'phantom',
        source: 'Tray I',
        text: 'phantom fog',
        options: judge(true, '“Ph” makes an “f” sound, so phantom and fog begin with the same sound: alliteration.', 'Different letters, but listen: “ph” sounds like “f”. Phantom fog begins with the same sound twice, so it IS alliteration.'),
      },
      {
        id: 'cold',
        source: 'Tray II',
        text: 'cold ceiling',
        options: judge(false, 'Same letter, different sounds: “cold” begins with a “k” sound and “ceiling” with an “s” sound. Not alliteration.', 'Both start with the letter c, but say them aloud: “k-old”, “s-eiling”. The sounds are different, so it is not alliteration.'),
      },
      {
        id: 'creaking',
        source: 'Tray III',
        text: 'creaking keys',
        options: judge(true, '“Creaking” and “keys” both begin with a hard “k” sound, even though one is spelled with c and one with k.', 'Look past the letters: c-reaking and k-eys both begin with the same hard “k” sound. That IS alliteration.'),
      },
      {
        id: 'giant',
        source: 'Tray IV',
        text: 'giant goat',
        options: judge(false, '“Giant” begins with a soft “j” sound and “goat” with a hard “g” sound. Same letter, different sounds: not alliteration.', 'Say them aloud: “j-iant”, “g-oat”. The letter is the same but the sounds are not, so it is not alliteration.'),
      },
      {
        id: 'whispering',
        source: 'Tray V',
        text: 'whispering walls',
        options: judge(true, 'Both words begin with a “w” sound: alliteration. It sounds soft and breathy, like a whisper.', 'Whispering and walls both begin with the same “w” sound. That IS alliteration.'),
      },
      {
        id: 'silver',
        source: 'Tray VI',
        text: 'silver knife',
        options: judge(false, 'The k in “knife” is silent: knife begins with an “n” sound, not “s”. No repeated beginning sound, so it is not alliteration.', 'Silver begins with “s”; knife begins with “n” (the k is silent). No sound repeats, so it is not alliteration.'),
      },
    ],
    takeaway: 'The press only inked the true alliterations. Listen for the first SOUND of each word; letters can fool you.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Set the Headline',
    prompt: 'The press is printing its last newspaper. Set the headline: choose one word from each tray. It must alliterate AND make sense. Then check it.',
    discussion: 'Will it alliterate when you SAY it? Does it make sense as a headline about this house?',
    retryHint: 'Change one tray and try again.',
    options: [],
    build: {
      goal: 'A headline that alliterates and makes sense',
      minRepeats: 2,
      trays: [
        {
          label: 'Describing word',
          tiles: [
            { id: 'silent', text: 'Silent', sound: 's', tags: ['ghost', 'sound', 'person'] },
            { id: 'cold', text: 'Cold', sound: 'k', tags: ['ghost', 'object', 'person', 'food'] },
            { id: 'phantom', text: 'Phantom', sound: 'f', tags: ['ghost', 'object', 'sound'] },
            { id: 'pickled', text: 'Pickled', sound: 'p', tags: ['food'] },
          ],
        },
        {
          label: 'Thing',
          tiles: [
            { id: 'spirits', text: 'spirits', sound: 's', tags: ['ghost', 'person'] },
            { id: 'keys', text: 'keys', sound: 'k', tags: ['object'] },
            { id: 'footsteps', text: 'footsteps', sound: 'f', tags: ['sound', 'person'] },
            { id: 'cucumbers', text: 'cucumbers', sound: 'k', tags: ['food'] },
            { id: 'ceilings', text: 'ceilings', sound: 's', tags: ['object', 'building'] },
          ],
        },
        {
          label: 'Action',
          tiles: [
            { id: 'slip', text: 'slip away', sound: 's', tags: ['ghost', 'person', 'sound'] },
            { id: 'clatter', text: 'clatter', sound: 'k', tags: ['object'] },
            { id: 'fade', text: 'fade', sound: 'f', tags: ['ghost', 'sound'] },
            { id: 'crunch', text: 'crunch', sound: 'k', tags: ['food'] },
            { id: 'creak', text: 'creak', sound: 'k', tags: ['building', 'object'] },
          ],
        },
      ],
    },
    takeaway: 'A good alliterative headline repeats a SOUND and still makes sense. Repeating a letter, or stringing together words that sound alike but mean nothing, does not count.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Last Edition',
    baseSentence: 'The press worked all night.',
    task: 'Rewrite this sentence using alliteration that sounds like the press at night. The repeated sound should fit the mood, and the sentence must still make sense.',
    starters: ['The patient press…', 'Silent sheets…', 'Through the dark, the…'],
    criteria: ['At least two nearby words begin with the same consonant SOUND', 'The sentence makes sense (not a list of random words)', 'The repeated sound fits the mood of the press at night'],
    questions: ['Which sound repeats? Say it.', 'Is it the same sound, or only the same letter?', 'How does that sound match the press?'],
    model: 'The patient press pounded pages past midnight.',
    modelParts: [
      { text: 'The ' },
      { text: 'patient press pounded pages past', role: 'word' },
      { text: ' midnight.' },
    ] as AnnotatedPart[],
    modelExplanation: 'The hard “p” sound repeats five times, like the steady thump of the press. The sentence still tells us something real: the press worked on and on into the night.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Press Falls Still',
    inscription: 'Sound, not spelling, sets the type.',
    summary: [
      'Alliteration repeats the same beginning consonant SOUND in nearby words.',
      'Sound matters, not spelling: phantom fog alliterates; cold ceiling does not.',
      'Silent letters do not count: knife begins with an “n” sound.',
      'Good alliteration still makes sense and fits the mood.',
    ],
    nextHint: 'The press printed one last sheet, and out of it fell a key cast in lead, like a piece of type.',
  },
} satisfies LessonContent;
