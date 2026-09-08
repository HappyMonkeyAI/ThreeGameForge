export type InputAction = string;

export type InputBinding = { action: InputAction; code: string };

/** Maps physical keyboard codes to stable game actions. */
export class KeyboardInput {
  private readonly pressed = new Set<InputAction>();
  private readonly bindings = new Map<string, InputAction>();
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = this.bindings.get(event.code);
    if (action) this.pressed.add(action);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = this.bindings.get(event.code);
    if (action) this.pressed.delete(action);
  };

  constructor(bindings: InputBinding[], target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window) {
    for (const binding of bindings) this.bindings.set(binding.code, binding.action);
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  isPressed(action: InputAction): boolean { return this.pressed.has(action); }

  dispose(target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    this.pressed.clear();
  }
}
