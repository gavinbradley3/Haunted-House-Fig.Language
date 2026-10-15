/** Shared shapes for every room's lesson content. */

export type RoomId = 'mirrors' | 'gallery';

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

export interface ChoiceChallenge {
  id: 'playA' | 'playB';
  title: string;
  kicker: string;
  prompt: string;
  baseSentence?: string;
  discussion: string;
  options: ChoiceOption[];
  /** Shown after the correct answer is found or revealed. */
  takeaway: string;
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
}
