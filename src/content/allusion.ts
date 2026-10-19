/**
 * All instructional content for the Forgotten Scholar's Study (ALLUSION).
 * Teachers can edit wording here without touching any game code.
 * No prior knowledge is assumed: every reference comes with an evidence card from the scholar's books.
 */
import { place, type AnnotatedPart, type ChoiceOption, type LessonContent } from './types';

/** The evidence for each allusion: what the class reads in the scholar's books. */
export const EVIDENCE = {
  pandora: { title: 'Greek myth: Pandora’s box', text: 'Pandora was given a box and told never to open it. She opened it anyway, and all the troubles of the world flew out. They could never be put back.' },
  achilles: { title: 'Greek myth: Achilles', text: 'Achilles was a great warrior whom no weapon could hurt, except in one place: his heel. In the end, an arrow to his heel defeated him.' },
  goliath: { title: 'An ancient story: David and Goliath', text: 'Goliath was a giant warrior, far bigger and stronger than anyone else. A young shepherd called David beat him with a sling and a single stone.' },
  beauty: { title: 'Fairy tale: Sleeping Beauty', text: 'A princess falls under a spell and sleeps for a hundred years, and her whole castle sleeps with her, until someone finally arrives and wakes her.' },
  houdini: { title: 'History: Harry Houdini (1874–1926)', text: 'Houdini was a famous magician who escaped from locked boxes, chains, handcuffs and even a sealed tank of water.' },
};

type Ref = keyof typeof EVIDENCE;

/** Three options; the correct one is placed at `pos`. */
function opts(right: string, why: string, wrong: [string, string, string][], pos: number): ChoiceOption[] {
  return place(
    [
      { id: 'r', letter: 'A', text: right, correct: true, verdict: 'That’s the one', explanation: why },
      ...wrong.map(([id, text, e]) => ({ id, letter: 'A', text, correct: false, verdict: 'Not quite', explanation: e })),
    ],
    pos,
  );
}

const SENTENCES: Record<Ref, string> = {
  pandora: 'Opening the attic door would be opening Pandora’s box.',
  achilles: 'The caretaker was strong, but his bad knee was his Achilles’ heel.',
  goliath: 'The wardrobe in the back hall was a Goliath.',
  beauty: 'Like Sleeping Beauty’s castle, the house had slept for a hundred years.',
  houdini: 'The scholar’s cat was a real Houdini.',
};

export const ALLUSION = {
  id: 'study',
  device: 'Allusion',
  room: 'The Forgotten Scholar’s Study',
  roleLabels: {
    subject: 'What is described',
    word: 'The reference',
    compared: '',
  },
  proveNoun: 'sentence',
  proveButton: 'Add it to the index cards',
  requireMastery: true,

  discover: {
    kicker: 'Discover',
    title: 'A Room Full of Stories',
    intro: 'The scholar collected stories from everywhere. Reveal each description, then look at the book that has opened on the desk.',
    labelA: 'Description A',
    labelB: 'Description B',
    descriptionA: 'Opening that door would cause terrible trouble.',
    descriptionB: 'Opening that door would be like opening Pandora’s box.',
    askB: 'The open book says: Pandora was told never to open a box. She did, and all the troubles of the world flew out, never to be put back. Why might a writer mention her here?',
    questions: [
      'What extra meaning does Pandora’s story add to description B?',
      'Would description B work for someone who had never heard of Pandora?',
      'Why do writers trust a few words to carry a whole story?',
    ],
  },

  learn: {
    kicker: 'Learn',
    steps: [
      {
        id: 'term',
        title: 'Allusion',
        term: 'ALLUSION',
        body: 'An allusion is a brief [reference] to a well-known person, story, place or event. The writer expects you to recognise it, so a few words can carry a whole story.',
      },
      {
        id: 'why',
        title: 'Two questions for every allusion',
        tryIt: 'When you meet an allusion, ask: (1) What is it referring to? (2) Why did the writer choose it HERE?',
        body: 'Allusions pack meaning into a few words. If you don’t know the reference, look it up or use the context, as a scholar would. Knowing the story is only half the job; the other half is working out what it tells us now.',
      },
      {
        id: 'annotate',
        title: 'Take the sentence apart',
        parts: [
          { text: 'The scholar’s cat', role: 'subject' },
          { text: ' was a real ' },
          { text: 'Houdini', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        question: 'Houdini was a famous magician who escaped from locked boxes and chains. What does that tell us about the cat?',
        effect: 'The cat escapes from everywhere: shut doors, closed rooms, boxes. One name does the work of a whole sentence, because we know Houdini’s story.',
      },
      {
        id: 'example2',
        title: 'An allusion to an ancient story',
        parts: [
          { text: 'The wardrobe in the back hall', role: 'subject' },
          { text: ' was a ' },
          { text: 'Goliath', role: 'word' },
          { text: '.' },
        ] as AnnotatedPart[],
        effect: 'In the old story, Goliath was a giant warrior. Calling the wardrobe a Goliath tells us it is enormous and towering, almost a giant itself.',
      },
      {
        id: 'nonExample',
        title: 'Careful: mentioning a story is not alluding to it',
        sentence: 'The scholar read a book about Greek myths.',
        verdict: 'NOT an allusion',
        body: 'This sentence talks about the myths directly. An allusion uses a famous story or person to describe SOMETHING ELSE, like a door, a cat or a wardrobe.',
        check: ['Is a famous story used to describe something else?  No.', 'It only says what the scholar read.'],
      },
    ],
  },

  playA: {
    id: 'playA',
    kicker: 'Play  ·  Challenge A',
    title: 'What Is the Reference?',
    prompt: 'The scholar left five sentences on index cards. For each one, open the book on the desk to read the evidence, then decide what the sentence is referring to.',
    discussion: 'Read the evidence first. Then ask: which story or person is this sentence pointing to?',
    retryHint: 'Read the evidence again, then look for the name in the sentence.',
    options: [],
    items: [
      {
        id: 'pandora',
        source: 'Index card I',
        text: SENTENCES.pandora,
        evidence: EVIDENCE.pandora,
        options: opts(
          'The Greek story of Pandora, who opened a box of troubles',
          'The sentence points to Pandora’s myth: a box that should never be opened.',
          [
            ['box', 'A box belonging to someone called Pandora who lives in the house', 'That reads the words literally. Pandora is the woman from the myth in the evidence, not someone in the house.'],
            ['treasure', 'A famous box of treasure', 'Pandora’s box was full of troubles, not treasure. Check the evidence.'],
          ],
          1,
        ),
      },
      {
        id: 'achilles',
        source: 'Index card II',
        text: SENTENCES.achilles,
        evidence: EVIDENCE.achilles,
        options: opts(
          'The Greek hero Achilles, who had one weak spot',
          'The sentence points to Achilles, the warrior who could only be hurt in his heel.',
          [
            ['heel', 'The caretaker had hurt his heel', 'The caretaker’s problem is his knee, not his heel. “Achilles’ heel” points to the myth.'],
            ['shoe', 'A kind of boot called an Achilles', 'There is no such boot here. Read the evidence: Achilles was a warrior.'],
          ],
          0,
        ),
      },
      {
        id: 'goliath',
        source: 'Index card III',
        text: SENTENCES.goliath,
        evidence: EVIDENCE.goliath,
        options: opts(
          'The giant warrior Goliath from the story of David and Goliath',
          'The sentence points to Goliath, the giant in the ancient story.',
          [
            ['brand', 'The company that made the wardrobe', 'Nothing in the sentence or the evidence is about who made it. Goliath was a giant.'],
            ['david', 'The small shepherd David', 'David is in the same story, but the sentence names Goliath, the giant.'],
          ],
          2,
        ),
      },
      {
        id: 'beauty',
        source: 'Index card IV',
        text: SENTENCES.beauty,
        evidence: EVIDENCE.beauty,
        options: opts(
          'The fairy tale of Sleeping Beauty, whose castle slept for a hundred years',
          'The sentence points to the fairy tale: a castle asleep for a hundred years.',
          [
            ['woman', 'A woman who is asleep somewhere in the house', 'That is a literal reading. The sentence compares the house to the fairy-tale castle.'],
            ['painting', 'A painting in the gallery called Sleeping Beauty', 'There is no such painting. The evidence is a fairy tale.'],
          ],
          1,
        ),
      },
      {
        id: 'houdini',
        source: 'Index card V',
        text: SENTENCES.houdini,
        evidence: EVIDENCE.houdini,
        options: opts(
          'Harry Houdini, the famous escape artist',
          'The sentence points to Houdini, the magician famous for escaping from anything.',
          [
            ['name', 'The cat is simply named Houdini', '“A real Houdini” means LIKE Houdini. It compares the cat to the escape artist.'],
            ['breed', 'A breed of cat called a Houdini', 'There is no such breed. Read the evidence: Houdini was a person.'],
          ],
          0,
        ),
      },
    ],
    takeaway: 'Each book on the desk is open now. You found what each sentence refers to. Next, the second question: why does it matter?',
  },

  playB: {
    id: 'playB',
    kicker: 'Play  ·  Challenge B',
    title: 'Why Does It Matter?',
    prompt: 'Now you know what each sentence refers to. Choose what the allusion tells us about the house in each one.',
    discussion: 'Which part of the story fits the thing being described?',
    retryHint: 'Which part of the story matches what is being described?',
    options: [],
    items: [
      {
        id: 'pandora',
        text: SENTENCES.pandora,
        evidence: EVIDENCE.pandora,
        options: opts(
          'Opening the door could let out trouble that can never be undone.',
          'Like Pandora’s box, the attic might hold troubles that, once released, cannot be put back. It is a warning.',
          [
            ['hasbox', 'There is a box in the attic.', 'That is too literal. The allusion is about what happens when something forbidden is opened.'],
            ['treasure', 'The attic is full of treasure.', 'Pandora’s box held troubles, not treasure. The allusion is a warning.'],
          ],
          2,
        ),
      },
      {
        id: 'achilles',
        text: SENTENCES.achilles,
        evidence: EVIDENCE.achilles,
        options: opts(
          'His knee is his one weakness: the place where he could be beaten.',
          'Achilles was unbeatable except in one spot. The caretaker is strong, but his knee is that one spot.',
          [
            ['hero', 'He is a famous Greek hero.', 'The caretaker is compared to Achilles, not turned into him. The point is the single weakness.'],
            ['shoes', 'He needs new shoes.', 'Nothing in the sentence is about shoes. Think about Achilles’ one weak spot.'],
          ],
          0,
        ),
      },
      {
        id: 'goliath',
        text: SENTENCES.goliath,
        evidence: EVIDENCE.goliath,
        options: opts(
          'It is enormous and towering, like a giant.',
          'Goliath was a giant, so the wardrobe is huge and imposing.',
          [
            ['loses', 'It is about to lose a fight.', 'Goliath did lose to David, but the sentence is about the wardrobe’s size, not a battle.'],
            ['ancient', 'It was made in ancient times.', 'The allusion is about Goliath’s size, not his age.'],
          ],
          1,
        ),
      },
      {
        id: 'beauty',
        text: SENTENCES.beauty,
        evidence: EVIDENCE.beauty,
        options: opts(
          'The house has stayed unchanged for a very long time, as if waiting for someone to arrive and wake it.',
          'In the fairy tale, everything stops until someone comes. The house has been frozen in time, waiting, and now you have arrived.',
          [
            ['princess', 'There is a princess in the house.', 'That reads the allusion too literally. The house is compared to the castle.'],
            ['asleep', 'Everyone in the house is asleep right now.', 'The point is time standing still while the house waits, not people sleeping.'],
          ],
          0,
        ),
      },
      {
        id: 'houdini',
        text: SENTENCES.houdini,
        evidence: EVIDENCE.houdini,
        options: opts(
          'The cat can escape from anywhere.',
          'Houdini escaped from locks and chains, so the cat gets out of every room it is shut in.',
          [
            ['magic', 'The cat does magic tricks.', 'Houdini was a magician, but he was famous for ESCAPES. That is the part that fits the cat.'],
            ['old', 'The cat is very old.', 'Nothing in the allusion is about age. Think about what Houdini was famous for.'],
          ],
          2,
        ),
      },
    ],
    takeaway: 'An allusion borrows the most important part of a story. Ask what it refers to, then ask which part of the story fits.',
  },

  prove: {
    kicker: 'Prove',
    title: 'The Scholar’s Index',
    baseSentence: 'The locked attic was dangerous.',
    task: 'Rewrite this sentence (or describe something else in the house) using one of the study’s allusions. Make sure you could explain what it refers to and why it fits.',
    starters: ['The attic was the house’s…', '…was a real Houdini.', 'Like Sleeping Beauty’s castle, …'],
    criteria: ['Refers to a well-known person, story, place or event', 'The part of the story it uses fits what is described', 'I can explain why I chose it'],
    questions: ['What does your allusion refer to?', 'Which part of that story fits?', 'What does it add that plain words would not?'],
    model: 'The locked attic was the house’s Pandora’s box: once opened, its troubles would never go back inside.',
    modelParts: [
      { text: 'The locked attic', role: 'subject' },
      { text: ' was the house’s ' },
      { text: 'Pandora’s box', role: 'word' },
      { text: ': once opened, its troubles would never go back inside.' },
    ] as AnnotatedPart[],
    modelExplanation: 'It refers to Pandora’s box, and it uses the part of the story that fits: trouble that cannot be undone. The second half of the sentence makes the meaning clear even for a reader who half-remembers the myth.',
  },

  complete: {
    kicker: 'Room Complete',
    title: 'The Scholar’s Last Card',
    inscription: 'Every story you know is a key to another.',
    summary: [
      'An allusion is a brief reference to a well-known person, story, place or event.',
      'Ask two questions: what does it refer to, and why was it chosen here?',
      'An allusion uses a story to describe something else; just mentioning a story is not an allusion.',
      'If you don’t know the reference, find the evidence, as a scholar would.',
    ],
    nextHint: 'Behind the last index card, the scholar left a key and a note: “For the Lady’s writing box.”',
  },
} satisfies LessonContent;
