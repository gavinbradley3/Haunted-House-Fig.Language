/**
 * THE LAST DANCE: the bonus mystery after the nine lessons. All of its words are here, so a teacher can
 * change them without touching the game code.
 *
 * What happened (never told all at once; the student pieces it together):
 *  In December 1874 the Lady of the House held a winter ball. Nine guests came. That evening she painted
 *  each of them by lamplight. At midnight the music stopped and every door in the house locked itself.
 *  By morning the guests had gone: their names are in the guest book, but none of them signed out.
 *  They are in their portraits. She tried to undo it, and the house took her too, into her own portrait
 *  above the hall fireplace. She has been searching the paintings ever since for someone who can find out
 *  the truth. Whether she meant to save her guests or to keep them is left for the student to decide.
 */

/** The nine guests, in the order they signed the guest book. `portrait` is where their painting hangs now. */
export const GUESTS: { name: string; arrived: string; portrait: string; where: string | null }[] = [
  { name: 'Mr Silas Marlowe', arrived: '8.05', portrait: 'The Old Man Was a Shadow', where: 'the Portrait Gallery' },
  { name: 'Miss Adelaide Fenn', arrived: '8.10', portrait: 'Portrait of a Lady, Waiting', where: 'the Portrait Gallery' },
  { name: 'Mr Edwin Ashby', arrived: '8.20', portrait: 'Portrait of a Young Man in Mourning', where: 'the Portrait Gallery' },
  { name: 'Miss Rosalind Ashby (aged nine)', arrived: '8.20', portrait: 'Girl with a China Doll', where: 'the Nursery' },
  { name: 'Colonel Augustus Pryce', arrived: '8.35', portrait: 'Under a dust sheet', where: null },
  { name: 'Mrs Harriet Pryce', arrived: '8.35', portrait: 'Under a dust sheet', where: null },
  { name: 'Dr Lionel Grey', arrived: '8.50', portrait: 'Under a dust sheet', where: null },
  { name: 'Miss Theodora Lark', arrived: '9.05', portrait: 'Under a dust sheet', where: null },
  { name: 'Mr Jasper Quill', arrived: '9.40', portrait: 'Under a dust sheet', where: null },
];

export const CHAPTER = {
  kicker: 'Bonus chapter',
  title: 'The Last Dance',
  lead: 'Discover what happened to the missing guests.',
  story: [
    'In the winter of 1874, the Lady of the House held a grand ball. Nine guests came.',
    'At midnight the music stopped. Every door in the house locked itself. By morning, all nine guests had vanished.',
  ],
  optional: 'You have finished all nine lessons. This mystery is optional: about ten minutes.',
  go: 'Investigate',
  later: 'Not now',
};

/** The page tucked into the Lady's diary on the landing (shown once the bonus chapter begins). */
export const JOURNAL = {
  kicker: 'A loose page, tucked inside the diary',
  title: 'The Night of the Ball',
  intro: [
    '21st December, 1874. Nine guests came to my winter ball. At midnight the music stopped, every door locked itself, and by morning they were gone.',
    'The paintings of this house saw what happened that night. I have locked the truth behind the first door on this landing. Only the paintings can open it.',
  ],
  under: 'Underneath, in a shakier hand:',
  /** The four clues, in the order the lock wants them. `answer` is the painting each one describes. */
  clues: [
    { n: 'I', text: 'The threshold she could not cross.', answer: 'coldFeet', where: 'the long corridor' },
    { n: 'II', text: 'The silence after the final dance.', answer: 'deafeningSilence', where: 'the Portrait Gallery' },
    { n: 'III', text: 'The reflection where no mirror stood.', answer: 'D07', where: 'the Portrait Gallery' },
    { n: 'IV', text: 'The single illuminated window.', answer: 'D16', where: 'the Nursery' },
  ],
  /** Shown when the student asks for a hint (or after two wrong tries at the lock). */
  hints: [
    'A painting of someone standing at an open door, who will not step through it.',
    'A painting of a huge, empty hall where nothing moves and nobody is dancing.',
    'A still life: look at what you can see in the side of the shiny jug.',
    'A painting of a tiny house at night, where only one room is lit.',
  ],
  footer: 'Set the four pictures on the lock of the right-hand door, in this order.',
};

export const LOCK = {
  title: 'The lock of the first door',
  intro: 'Four picture wheels are set into the lock. Turn each wheel to the painting its clue describes.',
  wrong: (n: number) => (n === 1 ? 'The lock does not turn. One of the four pictures is right.' : n === 0 ? 'The lock does not turn. None of the pictures is right yet.' : `The lock does not turn. ${n} of the four pictures are right.`),
  showRight: 'The wheels that are right now glow gold.',
  open: 'The lock turns. Somewhere behind the door, a music box plays three notes.',
  noJournal: 'Four little picture wheels are set into the lock. The diary on the console might explain them.',
};

export const LEDGER = {
  kicker: 'The Guest Records room',
  title: 'The Winter Ball, 21st December 1874',
  ask: 'Guests are kindly asked to sign in on arrival, and to sign out when they leave.',
  columns: ['Guest', 'Arrived', 'Left', 'Portrait painted that night'],
  realise: 'Nine guests signed in. Not one of them signed out.',
  lady: 'I thought I could keep them safe in their portraits. I did not know the house could keep them there.',
  ladySign: 'written at the bottom of the page, in the Lady’s hand',
  key: 'Something slips from between the pages: a small key on a green ribbon.',
};

/** Her last letter, on the desk in her room (after the encounter at the mirror). */
export const LAST_LETTER = {
  kicker: 'On the Lady’s desk',
  title: 'To whoever opened my door',
  body: [
    'That evening I painted my nine guests by lamplight, one after another, while the band played.',
    'At midnight the music stopped, and I heard every lock in the house turn. I thought that if the house took my guests, I could keep them safe in their portraits.',
    'Instead, the house kept them there. When I tried to bring them back, it took me too, into my own portrait above the fireplace.',
    'They are still in the paintings. I have never been able to leave them.',
    'Some nights I wonder whether I was trying to save them, or whether I simply could not bear to let them go.',
  ],
  ask: 'What do you think? Was the Lady trying to save her guests, or did she trap them?',
};

export const ENDING = {
  kicker: 'The Last Dance',
  title: 'They Never Left',
  lines: [
    'The nine guests at the winter ball never left the house. They are in their portraits, and the Lady is in hers.',
    'Was she their rescuer, or their captor? Only you can decide.',
  ],
  close: 'Keep exploring',
};

/** Short lines for the corner of the screen: the single next thing to do in the mystery. */
export const OBJECTIVES = {
  intro: 'Bonus chapter: the Last Dance is about to begin.',
  diary: 'The Last Dance: read the Lady’s diary on the upper landing (the stairs are on the left of the hall).',
  paintings: 'The Last Dance: find the four paintings the diary describes, then set them on the lock of the right-hand door upstairs. Press J to reread the clues.',
  records: 'The Last Dance: the first door is open. Read the guest book inside.',
  key: 'The Last Dance: take the small key that fell from the guest book.',
  ladyDoor: 'The Last Dance: open the Lady’s own door (the left-hand door on the landing) with her key.',
  mirror: 'The Last Dance: look into the Lady’s mirror.',
  message: 'The Last Dance: read the letter on the Lady’s desk.',
  done: 'You have read the whole house, and found out what happened at the Last Dance. Explore as long as you like.',
};

/** The story moments during the nine lessons. */
export const HOOKS = {
  early: { text: 'Someone else is in the house.', sub: 'A woman in green crossed the end of the corridor, and was gone.' },
  earlyQuiet: { text: 'Someone else is in the house.', sub: 'A door slammed, and soft footsteps hurried away.' },
  mid: { text: 'The Lady’s portrait is empty.', sub: 'Where has she gone?' },
  midHint: { text: 'Something has changed above the fireplace.', sub: 'Look at the Lady’s portrait.' },
};
