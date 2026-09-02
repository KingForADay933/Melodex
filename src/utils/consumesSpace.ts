/** Whether `target` already treats Space as its own activation key (native
 * buttons/links activate on Space via the browser's default action; our own
 * custom role="button" cells and text inputs handle it themselves) — used to
 * stop the global Space-for-play/stop shortcut from double-firing whenever
 * some other focused control would also react to the same keypress. */
export function consumesSpace(target: Element): boolean {
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'BUTTON' ||
    tag === 'A' ||
    (target as HTMLElement).isContentEditable ||
    target.getAttribute('role') === 'button'
  )
}
