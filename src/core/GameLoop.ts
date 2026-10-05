export interface Updatable {
  update(dt: number): void;
}

export class GameLoop {
  private running = false;
  private raf = 0;
  private previous = 0;
  private readonly systems: Updatable[] = [];

  add(system: Updatable): () => void {
    this.systems.push(system);
    return () => {
      const index = this.systems.indexOf(system);
      if (index >= 0) this.systems.splice(index, 1);
    };
  }

  start(render?: () => void): void {
    if (this.running) return;
    this.running = true;
    this.previous = performance.now();

    const frame = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min((now - this.previous) / 1000, 0.05);
      this.previous = now;
      for (const system of [...this.systems]) system.update(dt);
      render?.();
      this.raf = requestAnimationFrame(frame);
    };

    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  isRunning(): boolean {
    return this.running;
  }
}
