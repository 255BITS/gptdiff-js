/**
 * Diff parsing and in-memory diff application, ported from gptdiff's
 * applydiff.py. The browser has no filesystem, so `applyDiff` operates on a
 * plain `{ path: content }` map instead of a project directory on disk.
 */

import { splitLinesKeepEnds, splitLines } from './text.js';

/**
 * Parse unified diff text into individual per-file patches.
 *
 * Handles file creations (`+++ /dev/null`), deletions (`--- /dev/null` or
 * "deleted file mode"), standard modifications, headerless LLM diffs, and the
 * `*** Begin Patch` / `*** Update File:` delimiter style.
 *
 * @param {string} diffText
 * @returns {Array<[string, string]>} list of [filePath, patch] tuples
 */
export function parseDiffPerFile(diffText) {
  const dedupDiffs = (diffs) => {
    const groups = new Map();
    for (const [key, value] of diffs) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(value);
    }
    return Array.from(groups.entries()).map(([key, values]) => [key, values.join('\n')]);
  };

  // Special case: handle LLM-style patch delimiters.
  if (diffText.includes('*** Begin Patch')) {
    const lines = splitLines(diffText);
    const diffs = [];
    let currentLines = [];
    let currentFile = null;
    let inPatch = false;
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped === '*** Begin Patch') {
        inPatch = true;
        currentLines = [];
        currentFile = null;
      } else if (stripped === '*** End Patch') {
        if (currentFile !== null) diffs.push([currentFile, currentLines.join('\n')]);
        inPatch = false;
      } else if (inPatch) {
        if (stripped.startsWith('*** Update File:')) {
          currentFile = stripped.split(':').slice(1).join(':').trim();
        } else {
          currentLines.push(line);
        }
      }
    }
    return dedupDiffs(diffs);
  }

  const headerRe = /^(?:diff --git\s+)?(a\/[^ ]+)\s+(b\/[^ ]+)\s*$/;
  const lines = splitLines(diffText);

  // Check if any header line exists.
  if (!lines.some((line) => headerRe.test(line))) {
    // Fallback strategy: detect file headers from '---' / '+++' pairs.
    const diffs = [];
    let currentLines = [];
    let currentFile = null;
    let deletionMode = false;
    let fromHeader = null;
    const headerFromRe = /^-{2,3}\s+(.*)$/;
    const headerToRe = /^\+{2,3}\s+(.*)$/;

    const stripPrefix = (p) => (p.startsWith('a/') || p.startsWith('b/') ? p.slice(2) : p);

    for (const line of lines) {
      const fromMatch = line.match(headerFromRe);
      const toMatch = line.match(headerToRe);

      if (fromMatch) {
        if (currentFile !== null && currentLines.length) {
          if (deletionMode && !currentLines.some((l) => l.startsWith('+++ /dev/null'))) {
            currentLines.push('+++ /dev/null');
          }
          diffs.push([currentFile, currentLines.join('\n')]);
        }
        currentLines = [line];
        deletionMode = false;
        currentFile = null;
        fromHeader = fromMatch[1].trim();
        continue;
      }

      if (toMatch && currentLines.length) {
        currentLines.push(line);
        const fileTo = toMatch[1].trim();

        if (fileTo === '/dev/null') {
          deletionMode = true;
          if (fromHeader && fromHeader !== '/dev/null') {
            currentFile = stripPrefix(fromHeader);
          }
        } else {
          currentFile = stripPrefix(fileTo);
        }
        continue;
      }

      currentLines.push(line);
      if (line.includes('deleted file mode')) deletionMode = true;
    }

    if (currentFile !== null && currentLines.length) {
      if (deletionMode && !currentLines.some((l) => l.startsWith('+++ '))) {
        currentLines.push('+++ /dev/null');
      }
      diffs.push([currentFile, currentLines.join('\n')]);
    }
    return dedupDiffs(diffs);
  }

  // Header-based strategy.
  const diffs = [];
  let currentLines = [];
  let currentFile = null;
  let deletionMode = false;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (currentFile !== null && currentLines.length) {
        if (deletionMode && !currentLines.some((l) => l.startsWith('+++ '))) {
          currentLines.push('+++ /dev/null');
        }
        diffs.push([currentFile, currentLines.join('\n')]);
      }
      currentLines = [line];
      deletionMode = false;
      const fileTo = m[2]; // e.g. "b/index.html"
      currentFile = fileTo.startsWith('b/') ? fileTo.slice(2) : fileTo;
    } else {
      currentLines.push(line);
      if (line.includes('deleted file mode')) deletionMode = true;
      if (line.startsWith('+++ ')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const fileTo = parts[1].trim();
          if (fileTo !== '/dev/null') {
            currentFile = fileTo.startsWith('a/') || fileTo.startsWith('b/') ? fileTo.slice(2) : fileTo;
          }
        }
      }
    }
  }
  if (currentFile !== null && currentLines.length) {
    if (deletionMode && !currentLines.some((l) => l.startsWith('+++ '))) {
      currentLines.push('+++ /dev/null');
    }
    diffs.push([currentFile, currentLines.join('\n')]);
  }
  return dedupDiffs(diffs);
}

const HUNK_HEADER_RE = /^@@(?: -(\d+)(?:,(\d+))?)?(?: \+(\d+)(?:,(\d+))?)? @@/;

/**
 * Apply a single-file unified diff patch to `originalContent`.
 *
 * @param {string} originalContent
 * @param {string} patch
 * @returns {string | null} the patched content, or null if the patch fails
 */
function applyPatchToFile(originalContent, patch) {
  const originalLines = splitLinesKeepEnds(originalContent || '');
  const newLines = [];
  let currentIndex = 0;

  const patchLines = splitLines(patch);
  const rstripNewline = (s) => s.replace(/\n+$/, '');

  let i = 0;
  while (i < patchLines.length) {
    const line = patchLines[i];
    if (line.replace(/^\s+/, '').startsWith('@@')) {
      let origStart;
      if (line.trim() === '@@') {
        origStart = 1;
      } else {
        const m = line.trim().match(HUNK_HEADER_RE);
        if (!m) return null;
        origStart = m[1] !== undefined ? parseInt(m[1], 10) : 1;
      }
      const hunkStartIndex = origStart - 1; // diff headers are 1-indexed
      if (hunkStartIndex > originalLines.length) return null;
      for (let k = currentIndex; k < hunkStartIndex; k++) newLines.push(originalLines[k]);
      currentIndex = hunkStartIndex;
      i += 1;
      // Process hunk lines until the next hunk header.
      while (i < patchLines.length && !patchLines[i].startsWith('@@')) {
        const pline = patchLines[i];
        if (pline.startsWith(' ')) {
          const expected = pline.slice(1);
          if (currentIndex < 0 || currentIndex >= originalLines.length) return null;
          if (rstripNewline(originalLines[currentIndex]) !== expected) return null;
          newLines.push(originalLines[currentIndex]);
          currentIndex += 1;
        } else if (pline.startsWith('-')) {
          const expected = pline.slice(1);
          if (currentIndex < 0 || currentIndex >= originalLines.length) return null;
          if (rstripNewline(originalLines[currentIndex]) !== expected) return null;
          currentIndex += 1;
        } else if (pline.startsWith('+')) {
          newLines.push(pline.slice(1) + '\n');
        } else {
          // Bare context line without a leading space (LLM-style).
          const expected = pline;
          if (currentIndex < 0 || currentIndex >= originalLines.length) return null;
          if (rstripNewline(originalLines[currentIndex]) !== expected) return null;
          newLines.push(originalLines[currentIndex]);
          currentIndex += 1;
        }
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  // Append remaining original lines.
  for (let k = currentIndex; k < originalLines.length; k++) newLines.push(originalLines[k]);

  let content = newLines.join('');
  if (content && !content.endsWith('\n')) content += '\n';
  return content;
}

/**
 * Apply a unified diff to an in-memory file map.
 *
 * @param {Record<string, string>} files map of path -> content
 * @param {string} diffText unified diff string
 * @returns {{ changed: boolean, files: Record<string, string> }}
 *   `changed` is true iff at least one file was created, modified, or deleted.
 *   `files` is a new map; on failure it equals the input (no partial changes).
 */
export function applyDiff(files, diffText) {
  const filePatches = parseDiffPerFile(diffText);
  if (!filePatches.length) {
    return { changed: false, files: { ...files } };
  }

  const original = { ...files };
  const working = { ...files };

  for (const [filePath, patch] of filePatches) {
    if (patch.includes('+++ /dev/null')) {
      // Deletion patch.
      delete working[filePath];
    } else {
      const result = applyPatchToFile(
        Object.prototype.hasOwnProperty.call(working, filePath) ? working[filePath] : '',
        patch,
      );
      if (result === null) {
        return { changed: false, files: { ...original } };
      }
      working[filePath] = result;
    }
  }

  // Verify that at least one file actually changed.
  let anyChange = false;
  for (const [filePath, patch] of filePatches) {
    if (patch.includes('+++ /dev/null')) {
      if (!Object.prototype.hasOwnProperty.call(working, filePath)) anyChange = true;
    } else {
      const had = Object.prototype.hasOwnProperty.call(original, filePath);
      if (!had || original[filePath] !== working[filePath]) anyChange = true;
    }
  }

  if (!anyChange) {
    return { changed: false, files: { ...original } };
  }
  return { changed: true, files: working };
}
