/**
 * All instructional content for the Hall of Mirrors (SIMILE).
 * Teachers can edit wording here without touching any game code.
 */

export type { AnnotatedPart, ChoiceChallenge, ChoiceOption, CurtainMood, LessonContent } from './types';
export { ROLE_LABELS } from './types';
import type { AnnotatedPart, ChoiceChallenge, LessonContent } from './types';

export const SIMILE = {
  id: 'mirrors' as const,
  device: 'Simile',
  // Writing checkpoint: the class writes its own sentence and checks it against every success criterion.
  requireMastery: true,
  room: 'The Hall of Mirrors',

  discover: {
    kicker: 'Discover',
    title: 'Two Ways to See the Same Window',
    intro:
      'The mirror is showing you the same curtains, described two different ways. Reveal each description and watch the room.',
    descriptionA: 'The curtains moved in the wind.',
    descriptionB: 'The curtains trembled like frightened hands.',
    labelA: 'Description A',
    labelB: 'Description B',
    questions: [
      'Which description creates a stronger picture in your mind?',
      'In description B, what two things are being compared?',
      'How does the second sentence change the feeling of the room?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Simile',
        term: 'SIMILE',
        body: 'A simile compares two *different* things using the words [like] or [as].',
      },
      {
        id: 'why',
        title: 'Why writers use similes',
        tryIt: 'Picture “a cold room.” Now picture a room “as cold as a cellar in winter.” Which one can you feel?',
        body: 'A simile helps the reader picture something more clearly, or understand how something feels. The writer borrows a picture you already know and attaches it to the thing they are describing.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'The curtains', role: 'subject' },
          { text: ' trembled ' },
          { text: 'like', role: 'word' },
          { text: ' frightened hands', role: 'compared' },
          { text: '.' },
        ] as AnnotatedPart[],
        effect:
          'The curtains seem nervous, as if they are afraid of something in the room. Nothing scary has happened, yet the room already feels unsettling.',
      },
      {
        id: 'example2',
        title: 'Another simile',
        parts: [
          { text: 'The room', role: 'subject' },
          { text: ' was ' },
          { text: 'as', role: 'word' },
          { text: ' quiet ' },
          { text: 'as', role: 'word' },
          { text: ' an empty theatre', role: 'compared' },
          { text: '.' },
        ] as AnnotatedPart[],
        effect:
          'An empty theatre is a huge space built for noise, so its silence feels strange and expectant. The room feels like it is waiting for something to happen.',
      },
      {
        id: 'nonExample',
        title: 'Careful: not every "like" is a simile',
        sentence: 'I like mysterious stories.',
        verdict: 'NOT a simile',
        body: 'Here "like" means "enjoy." Nothing is being compared to anything else. A simile needs two different things AND a comparison word joining them.',
        check: [
          'Two different things?  No.',
          'Compared using like or as?  No. "Like" means "enjoy" here.',
        ],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Find the Genuine Simile',
    prompt: 'Only one of these sentences is a simile. Which one?',
    discussion: 'Talk with a partner. Be ready to explain why the other two are not similes.',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'I like old houses.',
        correct: false,
        verdict: 'Not a simile',
        explanation:
          '"Like" means "enjoy" here. The sentence tells us what someone enjoys, but it does not compare two things.',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The hallway was long and dark.',
        correct: false,
        verdict: 'Not a simile',
        explanation:
          'This describes the hallway directly. It is good description, but it does not compare the hallway to anything else, and there is no "like" or "as."',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The hallway stretched like a tunnel without an end.',
        correct: true,
        verdict: 'This is the simile',
        explanation:
          'It compares the hallway to an endless tunnel using "like." Now we picture a hallway that goes on forever, and we feel trapped inside it.',
      },
    ],
    takeaway:
      'Watch the mirror: the simile changed what we see. A plain description tells you about the hallway. A simile makes you imagine it.',
  } satisfies ChoiceChallenge,

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Change the Mood',
    prompt:
      'Rewrite the plain sentence so it uses a simile AND makes the room feel unsettling. Select each option to see how the curtains change.',
    baseSentence: 'The curtains moved.',
    discussion: 'Which version makes the room feel the most unsettling? Why?',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'The curtains fluttered like flags at a summer fair.',
        correct: false,
        verdict: 'A simile, but the wrong mood',
        explanation:
          'This IS a simile: it compares curtains to flags using "like." But flags at a fair feel cheerful and bright. The comparison creates a happy mood, not an unsettling one.',
        curtain: 'flutter',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The curtains moved slowly and quietly in the dark.',
        correct: false,
        verdict: 'Moody, but not a simile',
        explanation:
          'The extra details add some atmosphere, but nothing is compared to anything else. There is no simile here.',
        curtain: 'slow',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The curtains swelled and sank like something breathing behind them.',
        correct: true,
        verdict: 'The strongest choice',
        explanation:
          'It compares the curtains\' movement to breathing, using "like." Breathing means something alive, so we imagine someone hidden behind the fabric. The writer never says "scary," yet the picture makes us feel it.',
        curtain: 'breathe',
      },
      {
        id: 'd',
        letter: 'D',
        text: 'The curtains were, like, really creepy.',
        correct: false,
        verdict: 'Not a simile',
        explanation:
          'Here "like" is a filler word, the way people use it when talking. Nothing is compared. The sentence tells us the curtains are creepy instead of making us picture it.',
        curtain: 'still',
      },
    ],
    takeaway:
      'Option C shows the mood instead of naming it. A strong simile chooses a comparison that carries a feeling with it.',
  } satisfies ChoiceChallenge,

  prove: {
    kicker: 'Prove',
    title: "The Mirror's Final Request",
    baseSentence: 'The old clock ticked loudly.',
    task: 'With a partner, rewrite this sentence using a simile that makes the room feel unsettling.',
    starters: ['The old clock ticked like…', 'Each tick was as … as …', 'The ticking sounded like…'],
    criteria: [
      'Compares two different things',
      'Uses "like" or "as" to make the comparison',
      'Creates an unsettling mood',
    ],
    questions: [
      'What two things are being compared?',
      'Where is the comparison word?',
      'How does the comparison affect the mood?',
    ],
    model: "The clock's ticking was like slow footsteps in an empty hall.",
    modelParts: [
      { text: "The clock's ticking", role: 'subject' },
      { text: ' was ' },
      { text: 'like', role: 'word' },
      { text: ' slow footsteps in an empty hall', role: 'compared' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation:
      'Footsteps mean someone is coming. "Slow" and "an empty hall" make us wonder who. Now every tick sounds like something getting closer, and that builds suspense.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Mirror Is Satisfied',
    inscription: 'Seen not as it is, but as it is like.',
    summary: [
      'A simile compares two different things using "like" or "as."',
      'Not every "like" is a simile. "I like stories" compares nothing.',
      'A good simile helps the reader picture something and feel a mood.',
      'Writers choose comparisons on purpose: flags feel cheerful, breathing feels alive and close.',
    ],
    nextHint: 'A drawer has slid open beneath the mirror. Something small and brass is waiting inside. Take it with you.',
  },
};

SIMILE satisfies LessonContent;

export type ChallengeId = 'playA' | 'playB';

export function getChallenge(id: ChallengeId, content: LessonContent = SIMILE): ChoiceChallenge {
  return id === 'playA' ? content.playA : content.playB;
}
