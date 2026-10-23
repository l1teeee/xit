function waitForWindowLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();

  return new Promise(resolve => {
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

// The font set swaps in a new ready promise whenever more fonts start loading, so it is read after the load event, not before.
export async function waitForSiteReady(): Promise<void> {
  await waitForWindowLoad();
  await document.fonts.ready;
}
