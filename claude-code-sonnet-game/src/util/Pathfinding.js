/**
 * BFS pathfinding on a grid.
 * Returns an array of {tx, ty} from start (exclusive) to goal (inclusive),
 * or null if unreachable.
 */
export function bfs(startTx, startTy, goalTx, goalTy, passableFn) {
  const key = (x, y) => `${x},${y}`;
  const queue = [{ tx: startTx, ty: startTy, path: [] }];
  const visited = new Set([key(startTx, startTy)]);
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length) {
    const { tx, ty, path } = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = tx + dx;
      const ny = ty + dy;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      const newPath = [...path, { tx: nx, ty: ny }];
      if (nx === goalTx && ny === goalTy) return newPath;
      if (passableFn(nx, ny)) queue.push({ tx: nx, ty: ny, path: newPath });
    }
  }
  return null;
}
