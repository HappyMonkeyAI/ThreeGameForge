export type OverlayState = { title: string; lines: string[]; visible: boolean };

/** Minimal product-neutral overlay primitive for diagnostics, loading, and pause surfaces. */
export class Overlay {
  readonly element: HTMLDivElement;

  constructor(parent: HTMLElement, className = 'forge-overlay') {
    this.element = document.createElement('div');
    this.element.className = className;
    this.element.setAttribute('role', 'status');
    parent.appendChild(this.element);
  }

  render(state: OverlayState): void {
    this.element.hidden = !state.visible;
    this.element.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = state.title;
    this.element.append(title, ...state.lines.map((line) => {
      const item = document.createElement('span');
      item.textContent = line;
      return item;
    }));
  }

  dispose(): void { this.element.remove(); }
}
