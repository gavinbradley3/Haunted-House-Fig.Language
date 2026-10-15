/**
 * The mansion's curated paintings. Titles carry a figurative-language idea;
 * the note is what the museum label says when the teacher inspects one.
 * `ask` is an optional prompt for the class. Devices not yet taught are only hinted at.
 */
import type { ArtId } from '../systems/paintingScenes';

export interface PaintingInfo {
  id: string;
  art: ArtId;
  title: string;
  medium: string;
  note: string;
  ask?: string;
  /** Shown to the teacher only (small print): the device the title plays with. */
  teacherNote?: string;
}

export const PAINTINGS: Record<string, PaintingInfo> = {
  houseBreath: {
    id: 'houseBreath',
    art: 'houseBreath',
    title: 'The House That Held Its Breath',
    medium: 'Oil on canvas. Artist unknown.',
    note: 'An ordinary house seems to wait for something that never arrives. Not a branch moves. Even the pond refuses to ripple.',
    ask: 'Houses cannot breathe. Why would the artist say this one is holding its breath?',
    teacherNote: 'Personification: a house given a human action. Introduced in a later room.',
  },
  deafeningSilence: {
    id: 'deafeningSilence',
    art: 'deafeningSilence',
    title: 'A Deafening Silence',
    medium: 'Oil on canvas, c. 1890.',
    note: 'One small figure stands in a hall built for hundreds. Nothing moves, and the quiet seems almost loud.',
    ask: 'Can silence really be deafening? What do those two words do when they are put side by side?',
    teacherNote: 'Oxymoron: two contradictory words together. Introduced in a later room.',
  },
  caretaker: {
    id: 'caretaker',
    art: 'caretaker',
    title: 'The Caretaker Was a Storm',
    medium: 'Oil on canvas. Presented to the house by the family.',
    note: 'He kept every key in the house on one iron ring. The servants said you heard him long before you saw him.',
    ask: 'Look at his face, then at the sky around him. What does the artist want us to know about this man?',
    teacherNote: 'Metaphor. This painting begins the Portrait Gallery lesson.',
  },
  coldFeet: {
    id: 'coldFeet',
    art: 'coldFeet',
    title: 'Cold Feet',
    medium: 'Oil on board. Artist unknown.',
    note: 'Someone stands one step from an open door and does not take it. Look closely at the floor around their feet.',
    ask: 'People say they have "cold feet" before something big. What do they mean? What has the painter done with the phrase?',
    teacherNote: 'Idiom, painted literally. Introduced in a later room.',
  },
  whisperingWalls: {
    id: 'whisperingWalls',
    art: 'whisperingWalls',
    title: 'The Whispering Walls',
    medium: 'Oil on canvas, c. 1870.',
    note: 'A corridor much like the one outside. Stare at the wallpaper long enough and the pattern stops being flowers.',
    ask: 'What do you notice in the wallpaper? Why might the painter call these walls "whispering"?',
    teacherNote: 'Personification: walls cannot whisper. Introduced in a later room.',
  },
  oldManShadow: {
    id: 'oldManShadow',
    art: 'oldManShadow',
    title: 'The Old Man Was a Shadow',
    medium: 'Oil on canvas. The nameplate was found rubbed blank.',
    note: 'He leans on his stick at the edge of the light. His shadow on the wall is darker, and taller, than he is.',
    teacherNote: 'Metaphor. Used in Challenge A: its title stays hidden until the class restores it.',
  },
  nervousSitter: {
    id: 'nervousSitter',
    art: 'nervousSitter',
    title: 'Portrait of a Lady, Waiting',
    medium: 'Oil on canvas, c. 1885.',
    note: 'She was painted at night by lamplight. The painter wrote that she never once let go of her own hands.',
    ask: 'How do you know she is nervous? Find the details.',
    teacherNote: 'Used in Challenge B: the portrait changes to show each sentence.',
  },
  ladyOfHouse: {
    id: 'ladyOfHouse',
    art: 'ladyOfHouse',
    title: 'The Lady of the House',
    medium: 'Oil on canvas. Hung above this fireplace since 1874.',
    note: 'She was painted looking at the front door. Some visitors insist she is not always looking at it.',
  },
  emptyFrame: {
    id: 'emptyFrame',
    art: 'emptyCanvas',
    title: 'Untitled',
    medium: 'Prepared canvas, never painted. A very good frame.',
    note: 'The brass plate below it is blank, as if the frame were waiting for someone to give it a title.',
  },
};

/** Hidden-title placeholder used before Challenge A restores the nameplate. */
export const BLANK_TITLE = 'Title missing';
