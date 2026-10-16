/** Shared shapes for every room's lesson content. */

export type RoomId = 'mirrors' | 'gallery' | 'dining' | 'nursery' | 'echoes' | 'press' | 'kitchen' | 'ballroom' | 'study' | 'finale';

/** Every lesson in the house, in the order the class meets them. */
export const ROOMS: RoomId[] = ['mirrors', 'gallery', 'dining', 'nursery', 'echoes', 'press', 'kitchen', 'ballroom', 'study', 'finale'];

/** The nine device rooms that must all be complete before the house's final lesson can end. */
export const DEVICE_ROOMS: RoomId[] = ROOMS.filter((r) => r !== 'finale');

/** How the velvet curtains in the Hall of Mirrors should move. */
export type CurtainMood = 'still' | 'ordinary' | 'tremble' | 'flutter' | 'slow' | 'breathe';

export type Role = 'subject' | 'word' | 'compared';

export interface AnnotatedPart {
  text: string;
  /** Annotation role drives the highlight colour and the label. */
  role?: Role;
  label?: string;
}

export interface ChoiceOption {
  id: string;
  letter: string;
  text: string;
  correct: boolean;
  /** One-line verdict shown in bold. */
  verdict: string;
  /** Teaching explanation: why it is or is not the answer. */
  explanation: string;
  /** Hall of Mirrors: curtain behaviour previewed when this option is selected. */
  curtain?: CurtainMood;
  /** Other rooms: a named environmental effect previewed when selected. */
  effect?: string;
}

/**
 * One part of a multi-part challenge: a sentence the class sorts, completes or labels.
 * Each part has its own options, check and feedback.
 */
export interface ChallengeItem {
  id: string;
  /** The sentence or remark being judged. Use ___ for a blank the options fill. */
  text: string;
  /** Small caption above the sentence (where it comes from in the room). */
  source?: string;
  options: ChoiceOption[];
  /** A sound the room plays for this item (a listening item). Played on request. */
  sound?: string;
  /** Written description of that sound, for anyone who cannot hear it. */
  caption?: string;
  /** Background the class reads before answering (allusions: what the reference is). */
  evidence?: { title: string; text: string };
}

/** One tile of type in a phrase-building challenge. */
export interface BuildTile {
  id: string;
  text: string;
  /** The beginning consonant SOUND, e.g. 'f' for "phantom", 's' for "ceiling". */
  sound: string;
  /** What the word can sensibly go with; neighbouring tiles must share at least one tag. */
  tags: string[];
}

/** Build a short phrase by choosing one tile from each tray, in order. */
export interface BuildSpec {
  goal: string;
  trays: { label: string; tiles: BuildTile[] }[];
  /** How many tiles must begin with the same sound. */
  minRepeats: number;
}

export interface ChoiceChallenge {
  id: 'playA' | 'playB';
  title: string;
  kicker: string;
  prompt: string;
  baseSentence?: string;
  discussion: string;
  /** Single-question challenges. Multi-part challenges leave this empty and use `items`. */
  options: ChoiceOption[];
  /** Multi-part challenge: every item must be solved before the class moves on. */
  items?: ChallengeItem[];
  /** Phrase-building challenge: solved when the built phrase meets the rules. */
  build?: BuildSpec;
  /** Shown after the correct answer is found or revealed. */
  takeaway: string;
  /** Hint shown after a wrong check, in place of the default. */
  retryHint?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  subject: 'What is being described',
  word: 'Comparison word',
  compared: 'What it is compared to',
};

/**
 * A learn card. Rendering is chosen by `id`:
 * term, why (text), annotate / example2 (annotated sentence), compare (side by side), nonExample.
 * In `body` text, *word* is emphasised and [word] is highlighted.
 */
export interface LearnStep {
  id: string;
  title: string;
  term?: string;
  body?: string;
  tryIt?: string;
  parts?: AnnotatedPart[];
  effect?: string;
  question?: string;
  rows?: { label: string; parts: AnnotatedPart[] }[];
  sentence?: string;
  verdict?: string;
  check?: string[];
}

export interface LessonContent {
  id: RoomId;
  device: string;
  room: string;
  roleLabels?: Record<Role, string>;
  discover: {
    kicker: string;
    title: string;
    intro: string;
    descriptionA: string;
    descriptionB: string;
    labelA: string;
    labelB: string;
    /** Optional prompts shown with each card as soon as it is revealed. */
    askA?: string;
    askB?: string;
    questions: string[];
  };
  learn: { kicker: string; steps: LearnStep[] };
  playA: ChoiceChallenge;
  playB: ChoiceChallenge;
  prove: {
    kicker: string;
    title: string;
    baseSentence: string;
    task: string;
    starters: string[];
    criteria: string[];
    questions: string[];
    model: string;
    modelParts: AnnotatedPart[];
    modelExplanation: string;
  };
  complete: {
    kicker: string;
    title: string;
    inscription: string;
    summary: string[];
    nextHint: string;
  };
  /** Words used in the panel for this room's Prove stage. */
  proveNoun?: string;
  proveButton?: string;
  /**
   * Mastery checkpoint: the lesson can be completed only after the class has entered its own
   * sentence and the teacher has ticked every success criterion for it.
   */
  requireMastery?: boolean;
}

/** Put the correct option at position `pos` (others keep their order) and re-letter A, B, C… */
export function place(options: ChoiceOption[], pos: number): ChoiceOption[] {
  const right = options.find((o) => o.correct)!;
  const rest = options.filter((o) => !o.correct);
  rest.splice(Math.min(pos, rest.length), 0, right);
  return rest.map((o, i) => ({ ...o, letter: 'ABCDEFGHI'[i] }));
}
