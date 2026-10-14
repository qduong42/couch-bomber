// BFS over grid tiles. Returns array of {gx,gy} from start (exclusive) to goal (inclusive),
// or null if no path. `isWalkable(gx, gy)` decides traversability for an enemy.
export function bfs(startGx, startGy, isGoal, isWalkable, cols, rows) {
  const seen = new Uint8Array(cols * rows);
  const prev = new Int32Array(cols * rows).fill(-1);
  const idx = (x, y) => y * cols + x;
  const q = [idx(startGx, startGy)];
  seen[idx(startGx, startGy)] = 1;
  let goalIdx = -1;

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (q.length) {
    const cur = q.shift();
    const cy = Math.floor(cur / cols);
    const cx = cur - cy * cols;
    if (isGoal(cx, cy)) { goalIdx = cur; break; }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = idx(nx, ny);
      if (seen[ni]) continue;
      if (!isWalkable(nx, ny)) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (goalIdx < 0) return null;
  const path = [];
  let cur = goalIdx;
  while (cur !== idx(startGx, startGy)) {
    const cy = Math.floor(cur / cols);
    const cx = cur - cy * cols;
    path.unshift({ gx: cx, gy: cy });
    cur = prev[cur];
    if (cur < 0) return null;
  }
  return path;
}
