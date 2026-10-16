/**
 * All instructional content for the final lesson, the Lady's Letter (ALL NINE DEVICES).
 * Teachers can edit wording here without touching any game code.
 */
import type { AnnotatedPart, ChoiceOption, LessonContent } from './types';

type Device = 'simile' | 'metaphor' | 'hyperbole' | 'personification' | 'onomatopoeia' | 'alliteration' | 'idiom' | 'oxymoron' | 'allusion';

const LABELS: Record<Device, string> = {
  simile: 'Simile',
  metaphor: 'Metaphor',
  hyperbole: 'Hyperbole',
  personification: 'Personification',
  onomatopoeia: 'Onomatopoeia',
  alliteration: 'Alliteration',
  idiom: 'Idiom',
  oxymoron: 'Oxymoron',
  allusion: 'Allusion',
};

/** The question each device answers, used to explain a wrong label. */
const NOT: Record<Device, string> = {
  simile: 'There is no “like” or “as” making a comparison, so it is not a simile.',
  metaphor: 'Nothing is said to BE something else, so it is not a metaphor.',
  hyperbole: 'Nothing is exaggerated far beyond the truth, so it is not a hyperbole.',
  personification: 'Nothing that is not human is given a human action or feeling, so it is not personification.',
  onomatopoeia: 'No word here imitates a sound, so it is not onomatopoeia.',
  alliteration: 'No beginning consonant sound repeats in nearby words, so it is not alliteration.',
  idiom: 'These words mean what they say together; there is no fixed expression with a hidden meaning.',
  oxymoron: 'No two contradictory words are joined into one idea, so it is not an oxymoron.',
  allusion: 'There is no reference to a well-known person, story, place or event, so it is not an allusion.',
};

/**
 * Four labelled options for one phrase of the letter, in the order given (so the right
 * answer moves around). `notes` replaces the default explanation for tricky wrong labels.
 */
function devices(correct: Device, choices: Device[], why: string, notes: Partial<Record<Device, string>> = {}): ChoiceOption[] {
  return choices.map((d, i) => ({
    id: d,
    letter: 'ABCD'[i],
    text: LABELS[d],
    correct: d === correct,
    verdict: d === correct ? LABELS[d] : `Not ${LABELS[d].toLowerCase()}`,
    explanation: d === correct ? why : (notes[d] ?? NOT[d]),
  }));
}

export const FINALE = {
  id: 'finale',
  device: 'Figurative Language',
  room: 'The Lady’s Letter',
  roleLabels: {
    subject: 'What is being described',
    word: 'The strange language',
    compared: 'What it is compared to',
  },
  proveNoun: 'sentence',
  proveButton: 'Add it to the letter',

  discover: {
    kicker: 'Discover',
    title: 'The House Has Been Speaking',
    intro: 'The writing box held a letter from the Lady of the House. Before you read it, look at two ways of describing this house.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The house was quiet.',
    descriptionB: 'The house was as quiet as a held breath, and every window watched us come home.',
    askB: 'How many kinds of strange language can you find in this one sentence?',
    questions: [
      'Find the simile in description B. What is being compared?',
      'Which part gives the house a human action?',
      'Why might a writer use two kinds of figurative language together?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Figurative language',
        term: 'FIGURATIVE LANGUAGE',
        body: 'Figurative language uses words in a way that is *not literal*, to help the reader [picture], [feel], [hear] or understand something. This house has taught you nine kinds.',
      },
      {
        id: 'compare',
        title: 'Nine kinds, nine questions',
        rows: [
          { label: 'Simile: compared using like or as?', parts: [{ text: 'The curtains', role: 'subject' }, { text: ' trembled ' }, { text: 'like', role: 'word' }, { text: ' frightened hands', role: 'compared' }, { text: '.' }] },
          { label: 'Metaphor: said to BE something else?', parts: [{ text: 'The caretaker', role: 'subject' }, { text: ' ' }, { text: 'was', role: 'word' }, { text: ' a storm', role: 'compared' }, { text: '.' }] },
          { label: 'Hyperbole: exaggerated beyond the truth?', parts: [{ text: 'I’ve waited', role: 'subject' }, { text: ' ' }, { text: 'a hundred years', role: 'word' }, { text: ' for this soup!' }] },
          { label: 'Personification: something not human acting human?', parts: [{ text: 'The music box', role: 'subject' }, { text: ' ' }, { text: 'sang itself to sleep', role: 'word' }, { text: '.' }] },
          { label: 'Onomatopoeia: a word that imitates a sound?', parts: [{ text: 'Drip. Drip. Drip.', role: 'word' }, { text: ' The pipe would not stop.' }] },
          { label: 'Alliteration: the same beginning SOUND repeated?', parts: [{ text: 'phantom fog', role: 'word' }] },
          { label: 'Idiom: a fixed expression that means something else?', parts: [{ text: 'Mrs. Hale', role: 'subject' }, { text: ' ' }, { text: 'spilled the beans', role: 'word' }, { text: '.' }] },
          { label: 'Oxymoron: two contradictory words joined into one idea?', parts: [{ text: 'a ' }, { text: 'deafening', role: 'word' }, { text: ' ' }, { text: 'silence', role: 'compared' }] },
          { label: 'Allusion: a reference to a well-known person, story, place or event?', parts: [{ text: 'The cat', role: 'subject' }, { text: ' was a real ' }, { text: 'Houdini', role: 'word' }, { text: '.' }] },
        ],
        body: 'When you meet strange language, ask the nine questions. More than one answer can be yes.',
      },
      {
        id: 'nonExample',
        title: 'Careful: one sentence can do two jobs',
        sentence: 'The giant’s shadow was a mountain that swallowed the room.',
        verdict: 'Metaphor AND hyperbole',
        body: 'The shadow is said to BE a mountain (metaphor), and no shadow is really as big as a mountain (hyperbole). Writers often combine devices. Name each one and explain what it does.',
        check: ['Said to BE something else?  Yes: the shadow is a mountain.', 'Exaggerated beyond the truth?  Yes: no shadow is that big.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Decode the Lady’s Letter',
    prompt: 'Nine phrases in the Lady’s letter are written in strange language, one of each kind the house has taught you. Label each one. Every phrase you decode brings light back into the hall.',
    discussion: 'Use the nine questions from the Learn card. Read each phrase aloud: some devices are heard, not seen.',
    retryHint: 'Look again and ask the questions in order.',
    options: [],
    items: [
      {
        id: 'stairs',
        source: '“When you first came in…”',
        text: 'the stairs groaned under every visitor',
        options: devices('personification', ['onomatopoeia', 'personification', 'hyperbole', 'metaphor'], 'Groaning is a human sound of pain or complaint. The stairs are given a human action, so this is personification.', {
          hyperbole: 'Stairs really can creak under people, so nothing is wildly exaggerated. The strange part is the human word “groaned”.',
          onomatopoeia: '“Groaned” describes a human sound, but the key move is giving the stairs a human action: personification.',
        }),
      },
      {
        id: 'moon',
        source: '“From my window…”',
        text: 'the moon hung over the garden like a lantern no one could reach',
        options: devices('simile', ['metaphor', 'allusion', 'simile', 'personification'], 'The moon is compared to a lantern using “like.” That makes it a simile.', {
          metaphor: 'Close, but the moon is not said to BE a lantern. It is compared using “like,” which makes it a simile.',
        }),
      },
      {
        id: 'hallway',
        source: '“At night…”',
        text: 'the long hallway was a throat that swallowed the light',
        options: devices('metaphor', ['metaphor', 'simile', 'idiom', 'personification'], 'The hallway is said to BE a throat, with no “like” or “as.” That makes it a metaphor.', {
          personification: 'A throat swallowing is a body action, but the key move is that the hallway is said to BE a throat. That makes it a metaphor.',
        }),
      },
      {
        id: 'clocks',
        source: '“All night long…”',
        text: 'every clock in the house went tick, tock, tick',
        options: devices('onomatopoeia', ['alliteration', 'personification', 'simile', 'onomatopoeia'], '“Tick, tock, tick” imitates the sound the clocks make. That is onomatopoeia.', {
          alliteration: 'Both words start with “t”, but the point is that “tick” and “tock” sound like the clocks: onomatopoeia.',
        }),
      },
      {
        id: 'drawing',
        source: '“I sat alone…”',
        text: 'in the dark, dusty drawing room',
        options: devices('alliteration', ['oxymoron', 'alliteration', 'onomatopoeia', 'hyperbole'], 'Dark, dusty, drawing: the same “d” sound begins three nearby words. That is alliteration.'),
      },
      {
        id: 'ballroom',
        source: '“After the last dance…”',
        text: 'a deafening silence filled the ballroom',
        options: devices('oxymoron', ['hyperbole', 'onomatopoeia', 'metaphor', 'oxymoron'], '“Deafening” and “silence” contradict each other, and together they describe one thing. That is an oxymoron.', {
          hyperbole: '“Deafening” might sound exaggerated, but here it is joined with its opposite, “silence”. That contradiction makes it an oxymoron.',
        }),
      },
      {
        id: 'thousand',
        source: '“I have been waiting…”',
        text: 'I have waited a thousand years for someone to read this letter',
        options: devices('hyperbole', ['idiom', 'hyperbole', 'metaphor', 'oxymoron'], 'No one waits a thousand years. The Lady exaggerates to show how long and lonely the waiting has felt. That is hyperbole.'),
      },
      {
        id: 'beans',
        source: '“And now…”',
        text: 'I have finally spilled the beans about this house',
        options: devices('idiom', ['metaphor', 'allusion', 'personification', 'idiom'], '“Spilled the beans” is a fixed expression meaning “told the secret”. No beans were spilled. That is an idiom.', {
          metaphor: 'It is not saying one thing IS another. It is a fixed expression with its own meaning: an idiom.',
        }),
      },
      {
        id: 'houdini',
        source: '“If only…”',
        text: 'but I am no Houdini, and I could never escape this house',
        options: devices('allusion', ['allusion', 'simile', 'metaphor', 'hyperbole'], 'Houdini was the famous escape artist. The Lady refers to him to say she could never escape. That is an allusion.', {
          metaphor: 'She does compare herself to someone, but what matters is WHO: a famous escape artist everyone knows. A reference like that is an allusion.',
        }),
      },
    ],
    takeaway: 'The hall is lit again. Nine kinds of strange language, nine different jobs: compare, transform, exaggerate, bring to life, sound, repeat, mean something else, contradict, and remind us of a story.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'What Is She Really Saying?',
    prompt: 'The Lady ends her letter: “Leave the door open when you go. The house is a sleeping giant, and it dreams of company.” What does she really mean?',
    discussion: 'Figurative language says one thing and means another. What do the giant and the dream stand for?',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'There is a real giant asleep somewhere in the house.',
        correct: false,
        verdict: 'A literal reading',
        explanation: '“The house is a sleeping giant” is a metaphor, so it is not meant literally. There is no real giant. Ask what a sleeping giant suggests about the house.',
        effect: 'none',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The house is big and quiet, and it is lonely. It wants visitors to come back.',
        correct: true,
        verdict: 'The best reading',
        explanation: 'The metaphor makes the house huge and quiet like a sleeping giant, and the personification (“it dreams of company”) gives it a lonely human wish. Together they tell us the house wants people back.',
        effect: 'turn',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The house is dangerous, and the class should leave as fast as possible.',
        correct: false,
        verdict: 'Only half the picture',
        explanation: 'A sleeping giant can sound threatening, but the Lady also says it “dreams of company” and asks you to leave the door open. That is an invitation, not a warning.',
        effect: 'shiver',
      },
      {
        id: 'd',
        letter: 'D',
        text: 'The front door is broken and will not close.',
        correct: false,
        verdict: 'Not what she means',
        explanation: 'Nothing in the letter says the door is broken. “Leave the door open” is a request, and the strange language around it is about the house’s feelings.',
        effect: 'none',
      },
    ],
    takeaway: 'Strange language is not a puzzle for its own sake. The metaphor and the personification work together so we feel the house’s loneliness.',
  },

  prove: {
    kicker: 'Prove',
    title: 'Answer the Letter',
    baseSentence: 'The house was old.',
    task: 'With a partner, write one sentence about this house using at least TWO kinds of figurative language. Be ready to name each one.',
    starters: ['The old house was…', 'Its windows…', 'The house was as … as …, and…'],
    criteria: ['Uses at least two kinds of figurative language', 'The class can name each kind correctly', 'Leaves the reader with a strong feeling about the house'],
    questions: ['Which kinds of figurative language did you use?', 'Point to the words that make each one work.', 'What feeling does your sentence leave the reader with?'],
    model: 'The old house was a sleeping giant, and its windows blinked like tired eyes as we said goodbye.',
    modelParts: [
      { text: 'The old house', role: 'subject' },
      { text: ' was ' },
      { text: 'a sleeping giant', role: 'compared' },
      { text: ', and its windows ' },
      { text: 'blinked', role: 'word' },
      { text: ' like tired eyes', role: 'compared' },
      { text: ' as we said goodbye.' },
    ] as AnnotatedPart[],
    modelExplanation: 'Three kinds at once: a metaphor (the house was a sleeping giant), personification (the windows blinked) and a simile (like tired eyes). Together they make the house feel huge, alive and sad to see us go.',
  },

  complete: {
    kicker: 'The End',
    title: 'The House Can Rest',
    inscription: 'You learned to read me. Come back and read me again.',
    summary: [
      'Simile compares with like or as; metaphor says one thing IS another.',
      'Hyperbole exaggerates on purpose; personification makes things act human.',
      'Onomatopoeia imitates a sound; alliteration repeats a beginning sound.',
      'An idiom means something other than its words; an oxymoron joins two contradictions.',
      'An allusion refers to a well-known person, story, place or event.',
      'Writers combine them to make readers picture, hear and feel.',
    ],
    nextHint: 'Morning is coming. The front doors have opened by themselves.',
  },
} satisfies LessonContent;
