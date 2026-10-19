/**
 * All instructional content for the Chamber of Echoes (ONOMATOPOEIA).
 * Teachers can edit wording here without touching any game code.
 */
import { place, type AnnotatedPart, type ChoiceOption, type LessonContent } from './types';

/** Options for a listening item: the matching sound word, a sound word for a different sound, a word that only describes. */
function listen(right: string, other: string, otherSound: string, plain: string, plainWhy: string, why: string, pos: number): ChoiceOption[] {
  return place([
    { id: 'a', letter: 'A', text: right, correct: true, verdict: 'Onomatopoeia that matches', explanation: why },
    {
      id: 'b',
      letter: 'B',
      text: other,
      correct: false,
      verdict: 'Onomatopoeia, but the wrong sound',
      explanation: `“${other}” IS onomatopoeia: it imitates ${otherSound}. Listen again: does this sound like that?`,
    },
    {
      id: 'c',
      letter: 'C',
      text: plain,
      correct: false,
      verdict: 'Describes, but does not imitate',
      explanation: `“${plain}” ${plainWhy} Onomatopoeia is a word that sounds like the noise itself.`,
    },
  ], pos);
}

/** Options for finding the one sound word in a sentence. `answer` is the id of the correct option. */
function find(words: [string, string][], answer: string, why: string): ChoiceOption[] {
  return words.map(([id, text], i) => ({
    id,
    letter: 'ABCD'[i],
    text,
    correct: id === answer,
    verdict: id === answer ? (id === 'none' ? 'Correct: no sound word here' : 'The sound word') : id === 'none' ? 'Look again' : 'Not a sound word',
    explanation: id === answer ? why : id === 'none' ? 'One of the words in this sentence does imitate a sound. Say each word aloud.' : `“${text}” does not imitate a sound. Say it aloud: does it sound like the noise it describes?`,
  }));
}

export const ONOMATOPOEIA = {
  id: 'echoes',
  device: 'Onomatopoeia',
  room: 'The Chamber of Echoes',
  roleLabels: {
    subject: 'What makes the sound',
    word: 'The sound word',
    compared: '',
  },
  proveNoun: 'sentence',
  proveButton: 'Write it on the score',
  requireMastery: true,

  discover: {
    kicker: 'Discover',
    title: 'The Room That Listens',
    intro: 'Something in the music room will not keep quiet. Reveal each description, then listen. If you cannot hear the sound, read the caption at the top of the screen and watch the bucket by the door.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The pipe made a noise in the dark.',
    descriptionB: 'Drip. Drip. Drip. The pipe would not stop.',
    askB: 'Which words in this description sound like the noise itself? Say them quietly to yourself.',
    questions: [
      'Which description lets you hear the room?',
      'Say “drip” slowly. How is the word like the sound?',
      'Why might a writer repeat “drip” three times?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Onomatopoeia',
        term: 'ONOMATOPOEIA',
        body: 'Onomatopoeia (say *on-oh-mat-oh-PEE-uh*) is a word that [imitates] the sound it names. Say it aloud and you hear the sound: *buzz*, *crash*, *drip*, *hiss*.',
      },
      {
        id: 'why',
        title: 'Why writers use it',
        tryIt: 'Read “The door closed.” Now read “The door went creak … thud.” Which one can you hear?',
        body: 'Onomatopoeia lets the reader hear a scene, not just see it. It can make writing feel close and sudden, and in a quiet, dark house even a small sound word can make us jump.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'The old gramophone', role: 'subject' },
          { text: ' ' },
          { text: 'hissed', role: 'word' },
          { text: ' and ' },
          { text: 'crackled', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Say “hissed” and “crackled” aloud. What do they sound like?',
        effect: 'Both words sound like the noise of an old record: a hiss of air and the crackle of dust under the needle. We hear the gramophone without being told what it sounded like.',
      },
      {
        id: 'example2',
        title: 'Sound words can stand alone',
        parts: [
          { text: 'Bang!', role: 'word' },
          { text: ' ' },
          { text: 'The piano lid', role: 'subject' },
          { text: ' slammed shut.' },
        ] as AnnotatedPart[],
        effect: '“Bang!” on its own, with an exclamation mark, hits the reader as suddenly as the sound. Writers often put a sound word first to make a moment jump out.',
      },
      {
        id: 'nonExample',
        title: 'Careful: naming a sound is not imitating it',
        sentence: 'The room was very noisy.',
        verdict: 'NOT onomatopoeia',
        body: '“Noisy” tells us there was sound, but the word does not sound like any particular noise. Words like “loud”, “quiet” and “noisy” describe sound; onomatopoeia imitates it.',
        check: ['Does any word sound like the noise it names?  No.', '“Noisy” and “loud” describe a sound. They do not imitate one.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Name That Sound',
    prompt: 'Objects in the room are making sounds. Play each one, listen, and choose the word that imitates it. Each sound also has a written caption, and its object glows while it plays.',
    discussion: 'Listen first, then say each word quietly to yourself. Which one sounds like what you heard?',
    retryHint: 'Play the sound again (or read its caption) and say the words quietly to yourself.',
    options: [],
    items: [
      {
        id: 'drip',
        source: 'The pipe above the bucket',
        text: 'What sound does the pipe make?',
        sound: 'drip',
        caption: 'Single drops of water falling into a metal bucket, one after another.',
        options: listen('drip', 'buzz', 'a bee or an insect', 'wet', 'describes the water, but the word itself makes no sound.', '“Drip” is short and light, like one drop landing. The word sounds like the sound.', 1),
      },
      {
        id: 'hiss',
        source: 'The gramophone',
        text: 'What sound comes out of the gramophone’s horn?',
        sound: 'hiss',
        caption: 'A soft, steady rush, like air escaping from a tyre.',
        options: listen('hiss', 'bang', 'a sudden explosion or a slam', 'quiet', 'describes how loud something is, but it does not imitate any sound.', 'Say “hiss” and stretch the “ss”: it sounds like the steady rush of air from the horn.', 2),
      },
      {
        id: 'tick',
        source: 'The metronome on the piano',
        text: 'What sound does the metronome make?',
        sound: 'tick',
        caption: 'Short, sharp clicks at a steady beat.',
        options: listen('tick-tock', 'whoosh', 'something rushing past through the air', 'slow', 'tells us the speed, but the word does not sound like anything.', '“Tick-tock” is short and sharp, with a steady rhythm, just like the clicks of the metronome.', 0),
      },
      {
        id: 'creak',
        source: 'The organ bench',
        text: 'What sound does the bench make?',
        sound: 'creak',
        caption: 'A long, slow, wooden groan, as if a board were bending.',
        options: listen('creak', 'pop', 'a bubble or a cork, short and sudden', 'old', 'tells us about the bench, but it does not imitate the sound it makes.', 'Say “creak” slowly: it stretches and grates, like old wood bending under weight.', 2),
      },
      {
        id: 'knock',
        source: 'Inside the piano',
        text: 'What sound comes from inside the piano?',
        sound: 'knock',
        caption: 'Two heavy, hollow raps on wood.',
        options: listen('knock', 'hum', 'a low, steady buzz, like a voice with closed lips', 'scary', 'describes how the sound makes us feel, but it does not imitate the sound.', '“Knock” is short and hard, like a fist on wood. Something inside the piano wants out.', 1),
      },
    ],
    takeaway: 'Every object you named glowed when you heard it. Onomatopoeia works because the word and the sound match: say it, and you hear it.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Find the Sound Word',
    prompt: 'These lines were found on the music stand. In each one, choose the word that imitates a sound. One line has no sound word at all.',
    discussion: 'Say each line quietly to yourself. Which word sounds like the noise it names?',
    retryHint: 'Say each word quietly to yourself. Does it sound like a noise?',
    options: [],
    items: [
      {
        id: 'thud',
        text: 'Somewhere above us, a heavy door shut with a thud.',
        sound: 'thud',
        caption: 'A dull, heavy bump, like a door closing far away.',
        options: find(
          [
            ['above', 'above'],
            ['heavy', 'heavy'],
            ['thud', 'thud'],
          ],
          'thud',
          '“Thud” is dull and heavy, like the sound of a door hitting its frame.',
        ),
      },
      {
        id: 'meow',
        text: 'The thin cat crept across the floor and gave a soft meow.',
        options: find(
          [
            ['meow', 'meow'],
            ['crept', 'crept'],
            ['soft', 'soft'],
          ],
          'meow',
          'Animal noises are onomatopoeia too: “meow” imitates a cat’s cry.',
        ),
      },
      {
        id: 'none',
        text: 'The candle flickered in the cold, still air.',
        options: find(
          [
            ['flickered', 'flickered'],
            ['cold', 'cold'],
            ['none', 'No sound word'],
          ],
          'none',
          'Flickering is something we see, not something we hear. This sentence has no onomatopoeia.',
        ),
      },
      {
        id: 'sizzle',
        text: 'On the stove downstairs, something began to sizzle.',
        options: find(
          [
            ['stove', 'stove'],
            ['sizzle', 'sizzle'],
            ['downstairs', 'downstairs'],
          ],
          'sizzle',
          '“Sizzle” sounds like hot fat spitting in a pan.',
        ),
      },
      {
        id: 'splash',
        text: 'Splash! Something fell into the well.',
        sound: 'splash',
        caption: 'Something heavy hitting deep water.',
        options: find(
          [
            ['splash', 'Splash'],
            ['fell', 'fell'],
            ['well', 'well'],
          ],
          'splash',
          '“Splash!” imitates the sound of something hitting water, and putting it first makes the moment sudden.',
        ),
      },
    ],
    takeaway: 'You can find onomatopoeia by ear: read the line aloud and listen for the word that makes the noise it names.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Midnight Score',
    baseSentence: 'The music room was noisy at midnight.',
    task: 'Rewrite this sentence so the reader can HEAR the room. Use at least one onomatopoeia that fits the thing making the sound, and keep the room eerie.',
    starters: ['At midnight the piano went…', 'Drip … drip …', 'Somewhere in the dark, a …'],
    criteria: ['Uses at least one word that imitates a sound', 'Each sound word fits the thing making the sound', 'The sounds make the room feel eerie'],
    questions: ['Which words imitate sounds?', 'What is making each sound?', 'How do the sounds change the mood?'],
    model: 'At midnight the piano went plink, the pipe went drip, drip, drip, and somewhere a floorboard creaked.',
    modelParts: [
      { text: 'At midnight the piano went ' },
      { text: 'plink', role: 'word' },
      { text: ', the pipe went ' },
      { text: 'drip, drip, drip', role: 'word' },
      { text: ', and somewhere a floorboard ' },
      { text: 'creaked', role: 'word' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation: 'Three sound words let us hear three different things in the dark. The last one, a creak from “somewhere”, makes us wonder who is there.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Room Falls Silent',
    inscription: 'Say the sound, and the sound is there.',
    summary: [
      'Onomatopoeia is a word that imitates the sound it names: drip, hiss, creak, thud.',
      'Words that only describe sound (“loud”, “noisy”) are not onomatopoeia.',
      'Animal noises (meow, woof) are onomatopoeia too.',
      'Sound words help a reader hear a scene and can make a moment sudden.',
    ],
    nextHint: 'The organ played one last chord by itself. Then the metronome on the piano stopped, and beside it lies a small brass key shaped like a bell.',
  },
} satisfies LessonContent;
