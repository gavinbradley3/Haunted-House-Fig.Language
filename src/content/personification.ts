/**
 * All instructional content for the Nursery (PERSONIFICATION).
 * Teachers can edit wording here without touching any game code.
 */
import type { AnnotatedPart, LessonContent } from './types';

export const PERSONIFICATION = {
  id: 'nursery',
  device: 'Personification',
  // Writing checkpoint: the class writes its own sentence and checks it against every success criterion.
  requireMastery: true,
  room: 'The Nursery',
  roleLabels: {
    subject: 'The thing that is not human',
    word: 'The human action, feeling or quality',
    compared: '',
  },
  proveNoun: 'personification',
  proveButton: 'Chalk it on the slate',

  discover: {
    kicker: 'Discover',
    title: 'Someone Still Plays Here',
    intro: 'A child’s room, left exactly as it was. Reveal each description of the rocking horse and watch the corner.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'The rocking horse stood in the corner.',
    descriptionB: 'The rocking horse waited in the corner, hoping someone would come back to play.',
    askB: 'Can a wooden horse really wait, or hope? Why would a writer say it does?',
    questions: [
      'Which description makes the nursery feel more lonely?',
      'What does the rocking horse do in description B that only a person could really do?',
      'How does that change the way you feel about this room?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Personification',
        term: 'PERSONIFICATION',
        body: 'Personification gives *human* actions, feelings or qualities to something that is [not human]: an object, an animal, the weather, even an idea.',
      },
      {
        id: 'why',
        title: 'Why writers use personification',
        tryIt: 'Compare “The door closed.” with “The door sighed shut behind us.” Which one makes the house feel alive?',
        body: 'Personification makes the reader feel that a thing is alive and has feelings of its own. That can make a scene cosy, lonely or unsettling, and it helps us care about things that cannot speak for themselves.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'The music box', role: 'subject' },
          { text: ' ' },
          { text: 'sang itself to sleep', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'A music box cannot sing or sleep. What picture does this give you?',
        effect: 'The tune slows down and stops, like a child’s voice drifting off to sleep. Giving the music box a child’s actions makes the empty nursery feel sad and lonely.',
      },
      {
        id: 'example2',
        title: 'Weather can be personified too',
        parts: [
          { text: 'The wind', role: 'subject' },
          { text: ' ' },
          { text: 'whispered secrets', role: 'word' },
          { text: ' at the window.' },
        ] as AnnotatedPart[],
        effect: 'Wind cannot whisper or keep secrets. Giving it a person’s voice makes us feel someone is just outside, trying to tell us something.',
      },
      {
        id: 'nonExample',
        title: 'Careful: things doing what they really do',
        sentence: 'The rocking chair creaked by the fire.',
        verdict: 'NOT personification',
        body: 'Chairs really do creak, so nothing human has been given to the chair. A person doing a human thing is not personification either: “The girl whispered” is just a girl whispering.',
        check: ['Is the thing not human?  Yes, it is a chair.', 'Is it given a human action, feeling or quality?  No. Creaking is what real chairs do.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'Wake the Toys',
    prompt: 'Each toy is waiting for the right word. For each sentence, choose the word that personifies the toy. The correct choice wakes it.',
    discussion: 'Ask: is this something the toy could really do, or something only a person does?',
    retryHint: 'Look again: which word is something only a person could do or feel?',
    options: [],
    items: [
      {
        id: 'horse',
        source: 'The rocking horse',
        text: 'The rocking horse ___ in the corner.',
        options: [
          { id: 'a', letter: 'A', text: 'stood', correct: false, verdict: 'Literal', explanation: 'A rocking horse really does stand. Nothing human has been given to it.' },
          { id: 'b', letter: 'B', text: 'sulked', correct: true, verdict: 'Personification', explanation: 'Sulking is a human mood: being upset and refusing to join in. Now the horse seems hurt that nobody plays with it.' },
        ],
      },
      {
        id: 'musicBox',
        source: 'The music box',
        text: 'The music box ___ a lullaby.',
        options: [
          { id: 'a', letter: 'A', text: 'played', correct: false, verdict: 'Literal', explanation: 'Music boxes really play tunes. This is what a music box actually does.' },
          { id: 'b', letter: 'B', text: 'hummed to itself', correct: true, verdict: 'Personification', explanation: 'Humming to yourself is something a person does, quietly, when alone. The music box seems to keep itself company.' },
        ],
      },
      {
        id: 'dollhouse',
        source: 'The dollhouse',
        text: 'The dollhouse’s tiny windows ___.',
        options: [
          { id: 'a', letter: 'A', text: 'watched us cross the room', correct: true, verdict: 'Personification', explanation: 'Watching is something people do with their eyes. The windows become eyes, and the dollhouse seems to be keeping an eye on us.' },
          { id: 'b', letter: 'B', text: 'were lit', correct: false, verdict: 'Literal', explanation: 'Windows really can be lit. Nothing human has been given to the dollhouse.' },
          { id: 'c', letter: 'C', text: 'glowed like little lanterns', correct: false, verdict: 'A simile, not personification', explanation: 'This compares the windows to lanterns using “like.” Lanterns are not human, so the windows are not given a human action.' },
        ],
      },
      {
        id: 'teddy',
        source: 'The teddy bear',
        text: 'The teddy bear ___ on the bed.',
        options: [
          { id: 'a', letter: 'A', text: 'sat', correct: false, verdict: 'Literal', explanation: 'A teddy bear can be placed sitting up. This is literal.' },
          { id: 'b', letter: 'B', text: 'kept watch over the empty pillow', correct: true, verdict: 'Personification', explanation: 'Keeping watch means caring and staying alert, like a loyal guard. The bear seems to be waiting for the child to come back.' },
        ],
      },
    ],
    takeaway: 'Every toy that woke was given something only a person can do or feel. The literal words left the toys asleep.',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'The Music Box’s Song',
    prompt: 'Which sentence uses personification to make the nursery feel lonely? Select each option and listen to the music box.',
    baseSentence: 'The music box played.',
    discussion: 'Listen as well as read. Which song matches the feeling of an empty nursery?',
    options: [
      {
        id: 'a',
        letter: 'A',
        text: 'The music box played a cheerful tune.',
        correct: false,
        verdict: 'Not personification',
        explanation: 'Music boxes really play tunes, so nothing human is given to it. And “cheerful” is the wrong mood for a lonely room.',
        effect: 'cheerful',
      },
      {
        id: 'b',
        letter: 'B',
        text: 'The music box giggled and danced its tune around the room.',
        correct: false,
        verdict: 'Personification, but the wrong mood',
        explanation: 'Giggling and dancing are human actions, so this IS personification. But they make the music box playful and happy, not lonely.',
        effect: 'dance',
      },
      {
        id: 'c',
        letter: 'C',
        text: 'The music box sang one last lullaby to a room that no longer listened.',
        correct: true,
        verdict: 'The strongest choice',
        explanation: 'Singing and listening are human actions given to a music box and a room. A lullaby nobody hears makes the nursery feel abandoned and lonely.',
        effect: 'lullaby',
      },
      {
        id: 'd',
        letter: 'D',
        text: 'The music box was like a tiny piano.',
        correct: false,
        verdict: 'A simile, not personification',
        explanation: 'It compares the music box to a piano using “like.” A piano is not human, so nothing human is given to the music box.',
        effect: 'plain',
      },
    ],
    takeaway: 'The music box sang to an empty room. Personification can make us feel sorry for an object, and that is how a writer builds a lonely mood.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Slate’s Last Lesson',
    baseSentence: 'The wind blew through the nursery window.',
    task: 'Rewrite this sentence using personification. Give the wind (or the window) a human action or feeling that makes the nursery feel lonely or unsettling.',
    starters: ['The wind crept…', 'The window shivered as…', 'The wind searched…'],
    criteria: ['Gives something that is not human a human action, feeling or quality', 'It is clear which thing is being personified', 'Creates a lonely or unsettling mood'],
    questions: ['What is being personified?', 'Which word gives it a human action or feeling?', 'How does that change the mood of the nursery?'],
    model: 'The wind crept through the nursery window and searched every empty bed for someone to wake.',
    modelParts: [
      { text: 'The wind', role: 'subject' },
      { text: ' ' },
      { text: 'crept', role: 'word' },
      { text: ' through the nursery window and ' },
      { text: 'searched every empty bed for someone to wake', role: 'word' },
      { text: '.' },
    ] as AnnotatedPart[],
    modelExplanation: 'Creeping and searching are things a person does on purpose. The wind seems to be looking for the child who used to sleep here, and that is both lonely and unsettling.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Toys Are Awake',
    inscription: 'Give a thing a heart, and it will break yours.',
    summary: [
      'Personification gives human actions, feelings or qualities to something that is not human.',
      'Things doing what they really do are literal: chairs creak, music boxes play.',
      'People doing human things are not personification.',
      'Personification can make a place feel cosy, lonely or unsettling.',
    ],
    nextHint: 'The music box has opened by itself. Inside, where the tune should be, lies a small silver key.',
  },
} satisfies LessonContent;
