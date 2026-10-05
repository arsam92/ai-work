export class GameTime {
  private seconds = 0;

  constructor(initialSeconds = 0) {
    this.seconds = Math.max(0, initialSeconds);
  }

  advance(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return this.seconds;
    this.seconds += deltaSeconds;
    return this.seconds;
  }

  getSeconds(): number {
    return this.seconds;
  }

  getHours(): number {
    return this.seconds / 3600;
  }

  snapshot(): number {
    return this.seconds;
  }

  restore(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid game time.");
    this.seconds = seconds;
  }
}
