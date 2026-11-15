/**
 * Dhamrai Life — Keyboard & Mouse Input Manager
 */

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;     // 'F' key pressed this frame (Vehicle mount/dismount)
  talkInteract: boolean; // 'E' key pressed this frame (Talk to NPC / Trigger)
  cameraToggle: boolean; // 'V' key pressed this frame
  bell: boolean;         // 'Space' pressed this frame
  toggleJournal: boolean;   // 'J' key pressed this frame
  toggleInventory: boolean; // 'I' key pressed this frame
  toggleDebug: boolean;     // 'F3' key pressed this frame
  toggleMute: boolean;      // 'M' key pressed this frame
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export class InputManager {
  private keysDown: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;
  private targetElement: HTMLElement | null = null;

  private onKeyDownBound = this.onKeyDown.bind(this);
  private onKeyUpBound = this.onKeyUp.bind(this);
  private onMouseMoveBound = this.onMouseMove.bind(this);
  private onPointerLockChangeBound = this.onPointerLockChange.bind(this);
  private onClickBound = this.onClick.bind(this);

  public attach(element: HTMLElement): void {
    this.targetElement = element;
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    element.addEventListener('click', this.onClickBound);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    if (this.targetElement) {
      this.targetElement.removeEventListener('click', this.onClickBound);
      this.targetElement = null;
    }
    this.keysDown.clear();
    this.justPressed.clear();
  }

  private normalizeCode(e: KeyboardEvent): string {
    if (e.code && e.code.length > 0) return e.code;
    const k = e.key.toLowerCase();
    if (k === 'w') return 'KeyW';
    if (k === 'a') return 'KeyA';
    if (k === 's') return 'KeyS';
    if (k === 'd') return 'KeyD';
    if (k === 'e') return 'KeyE';
    if (k === 'f') return 'KeyF';
    if (k === 'j') return 'KeyJ';
    if (k === 'i') return 'KeyI';
    if (k === 'v') return 'KeyV';
    if (k === 'm') return 'KeyM';
    if (k === ' ') return 'Space';
    if (e.key === 'F3') return 'F3';
    return e.key;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const code = this.normalizeCode(e);
    if (!this.keysDown.has(code)) {
      this.justPressed.add(code);
    }
    this.keysDown.add(code);
    if (e.code && e.code !== code) {
      if (!this.keysDown.has(e.code)) this.justPressed.add(e.code);
      this.keysDown.add(e.code);
    }

    // Prevent default browser scrolling on space and arrow keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const code = this.normalizeCode(e);
    this.keysDown.delete(code);
    if (e.code) this.keysDown.delete(e.code);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.targetElement;
  }

  private onClick(): void {
    if (!this.isPointerLocked && this.targetElement && typeof this.targetElement.requestPointerLock === 'function') {
      this.targetElement.requestPointerLock();
    }
  }

  public getInput(): InputState {
    const forward = this.isDown('KeyW') || this.isDown('ArrowUp');
    const backward = this.isDown('KeyS') || this.isDown('ArrowDown');
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft');
    const right = this.isDown('KeyD') || this.isDown('ArrowRight');
    const sprint = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
    const jump = this.isDown('Space');

    const interact = this.justPressed.has('KeyF');
    const talkInteract = this.justPressed.has('KeyE');
    const cameraToggle = this.justPressed.has('KeyV');
    const bell = this.justPressed.has('Space');
    const toggleJournal = this.justPressed.has('KeyJ');
    const toggleInventory = this.justPressed.has('KeyI');
    const toggleDebug = this.justPressed.has('F3');
    const toggleMute = this.justPressed.has('KeyM');

    const state: InputState = {
      forward,
      backward,
      left,
      right,
      sprint,
      jump,
      interact,
      talkInteract,
      cameraToggle,
      bell,
      toggleJournal,
      toggleInventory,
      toggleDebug,
      toggleMute,
      mouseDeltaX: this.mouseDeltaX,
      mouseDeltaY: this.mouseDeltaY,
    };

    // Reset frame-transient values
    this.justPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    return state;
  }

  public isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  // Direct simulation helper for unit testing
  public simulateKeyDown(code: string): void {
    if (!this.keysDown.has(code)) {
      this.justPressed.add(code);
    }
    this.keysDown.add(code);
  }

  public simulateKeyUp(code: string): void {
    this.keysDown.delete(code);
  }
}
