/**
 * Preact plant Effekte über requestAnimationFrame; jsdom feuert das erst nach
 * ~16 ms. Kürzere Wartezeiten lassen useEffect nicht laufen.
 */
export async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export async function clickButton(host: HTMLElement, label: string): Promise<void> {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(label));
  if (!button) throw new Error(`Knopf "${label}" nicht gefunden in: ${host.textContent}`);
  button.click();
  await flush();
}
