import { isValidTile, DIRS } from './Grid.js';

/**
 * BFS from (startRow, startCol) to (targetRow, targetCol).
 * isPassable(row, col) → boolean.
 * Returns array of {row, col} steps excluding start, or null if unreachable.
 */
export function bfs(startRow, startCol, targetRow, targetCol, isPassable) {
  if (startRow === targetRow && startCol === targetCol) return [];

  const key = (r, c) => r * 100 + c;
  const visited = new Set();
  visited.add(key(startRow, startCol));

  // Each queue entry: [row, col, path]
  const queue = [[startRow, startCol, []]];

  while (queue.length > 0) {
    const [r, c, path] = queue.shift();

    for (const { dr, dc } of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isValidTile(nr, nc)) continue;
      if (visited.has(key(nr, nc))) continue;
      if (!isPassable(nr, nc)) continue;

      const newPath = [...path, { row: nr, col: nc }];
      if (nr === targetRow && nc === targetCol) {
        return newPath;
      }
      visited.add(key(nr, nc));
      queue.push([nr, nc, newPath]);
    }
  }
  return null; // unreachable
}

/**
 * BFS returning the direction of the first step toward nearest of several targets.
 * Returns {dr, dc} or null.
 */
export function bfsToNearest(startRow, startCol, targets, isPassable) {
  if (targets.length === 0) return null;

  const key = (r, c) => r * 100 + c;
  const targetSet = new Set(targets.map(t => key(t.row, t.col)));
  const visited = new Set();
  visited.add(key(startRow, startCol));

  const queue = [[startRow, startCol, null]]; // [row, col, firstDir]

  while (queue.length > 0) {
    const [r, c, firstDir] = queue.shift();

    for (const { dr, dc } of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isValidTile(nr, nc)) continue;
      if (visited.has(key(nr, nc))) continue;
      if (!isPassable(nr, nc)) continue;

      const dir = firstDir ?? { dr, dc };
      if (targetSet.has(key(nr, nc))) return dir;

      visited.add(key(nr, nc));
      queue.push([nr, nc, dir]);
    }
  }
  return null;
}

/**
 * BFS returning the direction of the first step that maximises distance from threats.
 * Returns {dr, dc} or null.
 */
export function bfsFleeNearest(startRow, startCol, threats, isPassable) {
  if (threats.length === 0) return null;

  // Simple: try each adjacent passable tile, score = min taxicab distance to threats
  let bestDir = null;
  let bestScore = -1;

  for (const { dr, dc } of DIRS) {
    const nr = startRow + dr;
    const nc = startCol + dc;
    if (!isValidTile(nr, nc) || !isPassable(nr, nc)) continue;
    const score = Math.min(...threats.map(t => Math.abs(t.row - nr) + Math.abs(t.col - nc)));
    if (score > bestScore) {
      bestScore = score;
      bestDir = { dr, dc };
    }
  }
  return bestDir;
}
