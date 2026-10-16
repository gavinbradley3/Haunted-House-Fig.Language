/**
 * All instructional content for the Portrait Gallery (METAPHOR).
 * Teachers can edit wording here without touching any game code.
 */
import type { AnnotatedPart, LessonContent } from './types';

export const METAPHOR = {
  id: 'gallery',
  device: 'Metaphor',
  // Writing checkpoint: the class writes its own sentence and checks it against every success criterion.
  requireMastery: true,
  room: 'The Portrait Gallery',
  roleLabels: {
    subject: 'What is being described',
    word: 'Says it IS (no like or as)',
    compared: 'What it is said to be',
  },

  discover: {
    kicker: 'Discover',
    title: 'The Caretaker Was a Storm',
    intro: 'The largest painting in the gallery has a strange title. Look closely at the caretaker before anyone answers.',
    labelA: 'The painting’s title',
    labelB: 'A sentence you already know how to read',
    descriptionA: 'The caretaker was a storm.',
    descriptionB: 'The caretaker was like a storm.',
    askA: 'What do you think the artist means by calling this man a storm?',
    askB: 'How is this sentence different from the title of the painting?',
    questions: [
      'Is the caretaker really a storm? What is the artist telling us about him?',
      'Which sentence uses a word you learned in the Hall of Mirrors?',
      'Which version feels stronger, or more certain? Why?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Metaphor',
        term: 'METAPHOR',
        body: 'A metaphor compares two *different* things by saying one thing [is] another.',
      },
      {
        id: 'compare',
        title: 'Simile or metaphor?',
        rows: [
          {
            label: 'Simile',
            parts: [
              { text: 'The caretaker', role: 'subject' },
              { text: ' was ' },
              { text: 'like', role: 'word' },
              { text: ' a storm', role: 'compared' },
              { text: '.' },
            ],
          },
          {
            label: 'Metaphor',
            parts: [
              { text: 'The caretaker', role: 'subject' },
              { text: ' ' },
              { text: 'was', role: 'word' },
              { text: ' a storm', role: 'compared' },
              { text: '.' },
            ],
          },
        ],
        body: 'Neither sentence means the man is *literally* a storm. Both suggest he is angry, loud or dangerous. The metaphor drops [like] and [as], so the comparison feels more direct and more certain.',
      },
      {
        id: 'annotate',
        title: 'Read a metaphor',
        parts: [
          { text: 'Her smile', role: 'subject' },
          { text: ' ' },
          { text: 'was', role: 'word' },
          { text: ' a locked door', role: 'compared' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'What might this suggest about her?',
        effect:
          'A locked door keeps people out and hides what is behind it. Her smile may be hiding her true thoughts or feelings. We cannot tell what she is really thinking.',
      },
      {
        id: 'nonExample',
        title: 'Careful: a storm is not always a metaphor',
        sentence: 'The caretaker stood outside during a storm.',
        verdict: 'NOT a metaphor',
        body: 'This describes something that actually happened: a man, outside, in real bad weather. Nothing is being called something else, so there is no comparison at all.',
        check: ['Two different things compared?  No.', 'Is one thing said to BE another?  No. The storm is real weather here.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Restore the Missing Title',
    prompt: 'This painting’s brass nameplate has been rubbed blank. Only one of these was its real title: the metaphor. Which one?',
    discussion: 'Talk with a partner. Name what each of the other two is instead.',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'The Old Man Was Like a Shadow',
        correct: false,
        verdict: 'A simile, not a metaphor',
        explanation: 'It compares the old man to a shadow, but it uses "like." That makes it a simile, the device from the Hall of Mirrors.',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The Old Man Was a Shadow',
        correct: true,
        verdict: 'This is the metaphor',
        explanation:
          'It says the old man IS a shadow, with no "like" or "as." We picture someone thin, silent and easy to miss, as if he is fading away.',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The Old Man Stood in the Shadows',
        correct: false,
        verdict: 'A literal description',
        explanation: 'This tells us where the man actually stood. Nothing is compared, so it is neither a simile nor a metaphor.',
      },
    ],
    takeaway: 'Watch the nameplate and the painting. The metaphor turned the man himself into shadow, which the other two titles never did.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'The Painting Changes',
    prompt: 'Make the plain sentence more vivid with a metaphor that unsettles us. Select each option and watch the portrait.',
    baseSentence: 'The woman was very nervous.',
    discussion: 'Which option is a metaphor AND makes the portrait more unsettling? What does it make you picture?',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'She was as nervous as a cat in a thunderstorm.',
        correct: false,
        verdict: 'Vivid, but a simile',
        explanation: 'It compares her to a frightened cat using "as … as." It is a good simile, but this challenge asks for a metaphor.',
        effect: 'shiver',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'Her thoughts were a swarm of trapped moths.',
        correct: true,
        verdict: 'The strongest choice',
        explanation:
          'It says her thoughts ARE moths, with no "like" or "as." Trapped moths flutter frantically and bump against the glass, so we picture restless thoughts she cannot escape. The image makes her nervousness feel creepy and close.',
        effect: 'moths',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'She was extremely nervous and scared.',
        correct: false,
        verdict: 'Plain description',
        explanation: 'This only repeats the plain sentence with stronger words. Nothing is compared, so there is no metaphor and no new picture.',
        effect: 'none',
      },
      {
        id: 'd',
        letter: 'D',
        text: 'Her thoughts were a field of sunflowers.',
        correct: false,
        verdict: 'A metaphor, but the wrong mood',
        explanation: 'This IS a metaphor: her thoughts are said to be sunflowers. But sunflowers feel warm and calm. It makes her seem peaceful, not nervous.',
        effect: 'sunflowers',
      },
    ],
    takeaway: 'Look at the portrait now. A metaphor does not just name a feeling; it shows us one, and the comparison it chooses sets the mood.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Portrait’s Final Request',
    baseSentence: 'The house was quiet.',
    task: 'With a partner, rewrite this sentence as a metaphor that makes the house feel strange, unsettling or mysterious. The empty frame is waiting for a title.',
    starters: ['The house was…', 'The silence was…', 'Its hallways were…'],
    criteria: ['Compares two different things', 'Says one thing IS the other (no like or as)', 'Makes the house feel strange or unsettling'],
    questions: [
      'What two things are being compared?',
      'Why is this a metaphor and not a simile?',
      'How does the comparison change the mood of the house?',
    ],
    model: 'The house was a sleeping giant.',
    modelParts: [
      { text: 'The house', role: 'subject' },
      { text: ' ' },
      { text: 'was', role: 'word' },
      { text: ' a sleeping giant', role: 'compared' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation:
      'A giant is enormous and alive. A sleeping one is quiet now, but could wake if we disturb it. The silence stops feeling peaceful and starts to feel dangerous.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Gallery Remembers',
    inscription: 'Call a thing by another name, and it becomes it.',
    summary: [
      'A metaphor compares two different things by saying one thing IS the other.',
      'A simile uses "like" or "as"; a metaphor does not.',
      'Neither is literal: the caretaker is not really a storm.',
      'A good metaphor shows a feeling and sets a mood: moths feel frantic, a sleeping giant feels dangerous.',
    ],
    nextHint: 'The empty frame has swung away from the wall. Behind it, a second key is waiting.',
  },
} satisfies LessonContent;
