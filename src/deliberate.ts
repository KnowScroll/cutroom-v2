export const ok = 1;

async function work(): Promise<void> {
  await Promise.resolve();
}

work();
