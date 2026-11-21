// Prefer the import map. A pinned copy keeps the game playable during a CDN outage.
let library;
let timeout;
try {
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error('CDN timeout')), 3500);
  });
  library = await Promise.race([import('three'), deadline]);
} catch {
  library = await import('../vendor/three.module.min.js');
} finally {
  clearTimeout(timeout);
}
export default library;
