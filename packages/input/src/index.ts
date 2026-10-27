export type InputAction = string;

export type InputBinding = { action: InputAction; code: string };

export type InputTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** Maps physical keyboard codes to stable game actions. */
export class KeyboardInput {
  private readonly pressedCodes = new Set<string>();
  private readonly bindings = new Map<string, InputAction>();
  private readonly target: InputTarget;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.bindings.has(event.code)) this.pressedCodes.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedCodes.delete(event.code);
  };
  // Key-up events are never delivered once focus leaves the page, so held keys would stick.
  private readonly onBlur = (): void => {
    this.pressedCodes.clear();
  };

  constructor(bindings: InputBinding[], target: InputTarget = window) {
    for (const binding of bindings) this.bindings.set(binding.code, binding.action);
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  /** True while any key bound to `action` is held. */
  isPressed(action: InputAction): boolean {
    for (const code of this.pressedCodes) {
      if (this.bindings.get(code) === action) return true;
    }
    return false;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.pressedCodes.clear();
  }
}
