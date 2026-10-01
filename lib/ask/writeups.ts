import type { Source } from './knowledge';

export type Writeup = {
  /** Matches RESUME.projects[].id, e.g. 'chaingenie'. */
  projectId: string;
  /** Shown as the headline of every passage taken from this write-up. */
  title: string;
  /** Plain text. Each paragraph (separated by a blank line) becomes one searchable passage. */
  text: string;
  source: Source;
};

/**
 * Longer project history, written by Ayush. Ask Ayush shows these paragraphs word for word,
 * so only add text that is true and that you are happy for a recruiter to read.
 */
export const WRITEUPS: Writeup[] = [];
