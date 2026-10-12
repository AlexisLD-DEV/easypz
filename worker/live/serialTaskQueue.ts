export function createSerialTaskQueue() {
  let tail = Promise.resolve();

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous.catch(() => undefined);
      try {
        return await task();
      } finally {
        release();
      }
    }
  };
}
