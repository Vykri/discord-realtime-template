import { _decorator, Component, Input, input, EventKeyboard, KeyCode, EventTarget, EventMouse, Director, director, Vec2 } from 'cc';
const { ccclass } = _decorator;

enum ButtonInputType {
    NONE,

    LEFT_MOUSE,
    RIGHT_MOUSE,
    MIDDLE_MOUSE,
    MOUSE4,
    MOUSE5,
    MOUSE_WHEEL_UP,
    MOUSE_WHEEL_DOWN,
    MOUSE_WHEEL_LEFT,
    MOUSE_WHEEL_RIGHT,

    // TODO: Add all 98 keyboard keys
    KEY_W,
    KEY_A,
    KEY_S,
    KEY_D,
    KEY_E,
    SPACE,
    ESCAPE,
    TAB,
    BACKSPACE,
    LEFT_SHIFT,
    LEFT_CTRL,

    // TODO: Add support for touchscreens
    TOUCH,

    // TODO: Add support for gamepads
    LEFT_BUMPER,
    RIGHT_BUMPER,
    START,
    SELECT,
    D_PAD_UP,
    D_PAD_LEFT,
    D_PAD_DOWN,
    D_PAD_RIGHT,
    BUTTON_NORTH,
    BUTTON_WEST,
    BUTTON_SOUTH,
    BUTTON_EAST,
    LEFT_STICK_PRESS,
    RIGHT_STICK_PRESS,
    LEFT_TRIGGER,
    RIGHT_TRIGGER,
}

const EVENT_MOUSE_TO_BUTTON_INPUT_MAP: Partial<Record<number, ButtonInputType>> = {
    [EventMouse.BUTTON_LEFT]: ButtonInputType.LEFT_MOUSE,
    [EventMouse.BUTTON_RIGHT]: ButtonInputType.RIGHT_MOUSE,
    [EventMouse.BUTTON_MIDDLE]: ButtonInputType.MIDDLE_MOUSE,
    [EventMouse.BUTTON_4]: ButtonInputType.MOUSE4,
    [EventMouse.BUTTON_5]: ButtonInputType.MOUSE5,
};

const EVENT_KEYBOARD_TO_BUTTON_INPUT_MAP: Partial<Record<KeyCode, ButtonInputType>> = {
    [KeyCode.KEY_W]: ButtonInputType.KEY_W,
    [KeyCode.KEY_A]: ButtonInputType.KEY_A,
    [KeyCode.KEY_S]: ButtonInputType.KEY_S,
    [KeyCode.KEY_D]: ButtonInputType.KEY_D,
    [KeyCode.KEY_E]: ButtonInputType.KEY_E,
    [KeyCode.SPACE]: ButtonInputType.SPACE,
    [KeyCode.ESCAPE]: ButtonInputType.ESCAPE,
    [KeyCode.TAB]: ButtonInputType.TAB,
    [KeyCode.BACKSPACE]: ButtonInputType.BACKSPACE,
    [KeyCode.SHIFT_LEFT]: ButtonInputType.LEFT_SHIFT,
    [KeyCode.CTRL_LEFT]: ButtonInputType.LEFT_CTRL,
};

class ButtonInput extends EventTarget {

    private _isLocked: boolean = false;
    public get isLocked(): boolean { return this._isLocked; }
    public set isLocked(isLocked) {
        const wasHeld = this.isHeld;
        const wasLocked = this.isLocked;
        this._isLocked = isLocked;
        if (!wasLocked && this.isLocked) {
            if (wasHeld) {
                this.emit(InputEvent.UPDATED, true, false);
                this.emit(InputEvent.RELEASED);
            }
            this.emit(InputEvent.LOCKED);
        } else if (wasLocked && !this.isLocked) {
            this.emit(InputEvent.UNLOCKED);
            if (this.isHeld) {
                this.emit(InputEvent.PRESSED);
                this.emit(InputEvent.UPDATED, false, true);
            }
        }
    }

    private _bindings: Partial<Record<ButtonInputType, boolean>>;
    public get value(): boolean {
        return this.isHeld;
    }
    public get isHeld(): boolean {
        if (this.isLocked) {
            return false;
        }
        return !!Object.values(this._bindings).find(val => val);
    }

    constructor(binding: ButtonInputType|ButtonInputType[] = []) {
        super();
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        this._bindings = binding.reduce((acc, binding) => ({ ...acc, [binding]: false }), {});

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    public destroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    public addBinding(binding: ButtonInputType|ButtonInputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) === 'boolean') {
                return;
            }
            this._bindings[binding] = false;
        });
    }

    public removeBinding(binding: ButtonInputType|ButtonInputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) !== 'boolean') {
                return;
            }
            this.release(binding);
            delete this._bindings[binding];
        });
    }

    public removeAllBindings(): void {
        this.removeBinding(Object.keys(this._bindings).map(key => ButtonInputType[key]));
    }

    private press(binding: ButtonInputType) {
        if (typeof(this._bindings[binding]) !== 'boolean') {
            return;
        }
        const wasHeld = this.isHeld;
        this._bindings[binding] = true;
        if (!wasHeld && !this.isLocked) {
            this.emit(InputEvent.PRESSED);
            this.emit(InputEvent.UPDATED, false, true);
        }
    }

    private release(binding: ButtonInputType) {
        if (typeof(this._bindings[binding]) !== 'boolean') {
            return;
        }
        const wasHeld = this.isHeld;
        this._bindings[binding] = false;
        if (wasHeld && !this.isHeld) {
            this.emit(InputEvent.UPDATED, true, false);
            this.emit(InputEvent.RELEASED);
        }
    }

    private onKeyDown(event: EventKeyboard) {
        this.press(EVENT_KEYBOARD_TO_BUTTON_INPUT_MAP[event.keyCode]);
    }

    private onKeyUp(event: EventKeyboard) {
        this.release(EVENT_KEYBOARD_TO_BUTTON_INPUT_MAP[event.keyCode]);
    }

    private onMouseDown(event: EventMouse) {
        this.press(EVENT_MOUSE_TO_BUTTON_INPUT_MAP[event.getButton()]);
    }

    private onMouseUp(event: EventMouse) {
        this.release(EVENT_MOUSE_TO_BUTTON_INPUT_MAP[event.getButton()]);
    }

    private onMouseWheel(event: EventMouse) {
        if (event.getScrollY() < 0) {
            this.press(ButtonInputType.MOUSE_WHEEL_UP);
            director.once(Director.EVENT_AFTER_UPDATE, () => this.release(ButtonInputType.MOUSE_WHEEL_UP));
        } else if (event.getScrollY() > 0) {
            this.press(ButtonInputType.MOUSE_WHEEL_DOWN);
            director.once(Director.EVENT_AFTER_UPDATE, () => this.release(ButtonInputType.MOUSE_WHEEL_DOWN));
        }
        if (event.getScrollX() < 0) {
            this.press(ButtonInputType.MOUSE_WHEEL_LEFT);
            director.once(Director.EVENT_AFTER_UPDATE, () => this.release(ButtonInputType.MOUSE_WHEEL_LEFT));
        } else if (event.getScrollX() > 0) {
            this.press(ButtonInputType.MOUSE_WHEEL_RIGHT);
            director.once(Director.EVENT_AFTER_UPDATE, () => this.release(ButtonInputType.MOUSE_WHEEL_RIGHT));
        }
    }
}

enum Vec1InputType {
    NONE,

    MOUSE_WHEEL_DELTA_X,
    MOUSE_WHEEL_DELTA_Y,
    MOUSE_MOVE_DELTA_X,
    MOUSE_MOVE_DELTA_Y,

    // TODO: Add support for analog keyboards

    TOUCH_MOVE_DELTA_X,
    TOUCH_MOVE_DELTA_Y,

    LEFT_TRIGGER,
    RIGHT_TRIGGER,
    LEFT_STICK_HORIZONTAL,
    LEFT_STICK_VERTICAL,
    RIGHT_STICK_HORIZONTAL,
    RIGHT_STICK_VERTICAL,
}

class Vec1Input extends EventTarget {

    private _isLocked: boolean = false;
    public get isLocked(): boolean { return this._isLocked; }
    public set isLocked(isLocked) {
        const wasHeld = this.isHeld;
        const wasLocked = this.isLocked;
        const oldValue = this.value;
        this._isLocked = isLocked;
        if (!wasLocked && this.isLocked) {
            if (wasHeld) {
                this.emit(InputEvent.UPDATED, oldValue, this.value);
                this.emit(InputEvent.RELEASED);
            }
            this.emit(InputEvent.LOCKED);
        } else if (wasLocked && !this.isLocked) {
            this.emit(InputEvent.UNLOCKED);
            if (this.isHeld) {
                this.emit(InputEvent.PRESSED);
                this.emit(InputEvent.UPDATED, oldValue, this.value);
            }
        }
    }

    private _bindings: Partial<Record<Vec1InputType, number>>;
    public get value(): number {
        if (this.isLocked) {
            return 0;
        }
        return Object.values(this._bindings).reduce((acc, val) => Math.abs(val) > Math.abs(acc) ? val : acc, 0);
    }
    public get isHeld(): boolean {
        if (this.isLocked) {
            return false;
        }
        return this.value !== 0;
    }

    constructor(binding: Vec1InputType|Vec1InputType[] = []) {
        super();
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        this._bindings = binding.reduce((acc, binding) => ({...acc, [binding]: 0}), {});

        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        director.on(Director.EVENT_AFTER_UPDATE, this.onAfterUpdate, this);
    }

    public destroy(): void {
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        director.off(Director.EVENT_AFTER_UPDATE, this.onAfterUpdate, this);
    }

    public addBinding(binding: Vec1InputType|Vec1InputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) === 'number') {
                return;
            }
            this._bindings[binding] = 0;
        });
    }

    public removeBinding(binding: Vec1InputType|Vec1InputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) !== 'number') {
                return;
            }
            this.release(binding);
            delete this._bindings[binding];
        });
    }

    public removeAllBindings(): void {
        this.removeBinding(Object.keys(this._bindings).map(key => Vec1InputType[key]));
    }

    private update(binding: Vec1InputType, value: number) {
        if (value === 0) {
            this.release(binding);
        }
        if (typeof(this._bindings[binding]) !== 'number') {
            return;
        }
        const wasHeld = this.isHeld;
        const oldValue = this.value;
        this._bindings[binding] = value;
        const newValue = this.value;
        if (!wasHeld && !this.isLocked) {
            this.emit(InputEvent.PRESSED);
        }
        if (oldValue !== newValue) {
            this.emit(InputEvent.UPDATED, oldValue, newValue);
        }
    }

    private release(binding: Vec1InputType) {
        if (typeof(this._bindings[binding]) !== 'number') {
            return;
        }
        const wasHeld = this.isHeld;
        const oldValue = this.value;
        this._bindings[binding] = 0;
        const newValue = this.value;
        if (oldValue !== newValue) {
            this.emit(InputEvent.UPDATED, oldValue, newValue);
        }
        if (wasHeld && !this.isHeld) {
            this.emit(InputEvent.RELEASED);
        }
    }

    private onAfterUpdate(): void {
        this.release(Vec1InputType.MOUSE_MOVE_DELTA_X);
        this.release(Vec1InputType.MOUSE_MOVE_DELTA_Y);
        this.release(Vec1InputType.MOUSE_WHEEL_DELTA_X);
        this.release(Vec1InputType.MOUSE_WHEEL_DELTA_Y);
    }

    private onMouseMove(event: EventMouse) {
        this.update(Vec1InputType.MOUSE_MOVE_DELTA_X, event.getDeltaX());
        this.update(Vec1InputType.MOUSE_MOVE_DELTA_Y, event.getDeltaY());
    }

    private onMouseWheel(event: EventMouse) {
        this.update(Vec1InputType.MOUSE_WHEEL_DELTA_X, event.getScrollX());
        this.update(Vec1InputType.MOUSE_WHEEL_DELTA_Y, event.getScrollY());
    }
}

class Vec1Input_ButtonComposite extends EventTarget {

    private _isLocked: boolean = false;
    public get isLocked(): boolean { return this._isLocked; }
    public set isLocked(isLocked) {
        const wasHeld = this.isHeld;
        const wasLocked = this.isLocked;
        const oldValue = this.value;
        this._isLocked = isLocked;
        if (!wasLocked && this.isLocked) {
            if (wasHeld) {
                this.emit(InputEvent.UPDATED, oldValue, this.value);
                this.emit(InputEvent.RELEASED);
            }
            this.emit(InputEvent.LOCKED);
        } else if (wasLocked && !this.isLocked) {
            this.emit(InputEvent.UNLOCKED);
            if (this.isHeld) {
                this.emit(InputEvent.PRESSED);
                this.emit(InputEvent.UPDATED, oldValue, this.value);
            }
        }
    }

    public get value(): number {
        if (this.isLocked) {
            return 0;
        }
        const positiveValue = this._positiveInput.isHeld ? 1 : 0;
        const negativeValue = this._negativeInput.isHeld ? -1 : 0;
        return positiveValue + negativeValue;
    }
    public get isHeld(): boolean {
        if (this.isLocked) {
            return false;
        }
        return this.value !== 0;
    }

    private _positiveInput: ButtonInput;
    private _negativeInput: ButtonInput;
    private _prevValue: number = 0;

    constructor(positiveBinding: ButtonInputType|ButtonInputType[], negativeBinding: ButtonInputType|ButtonInputType[]) {
        super();
        this._positiveInput = new ButtonInput(positiveBinding);
        this._negativeInput = new ButtonInput(negativeBinding);

        this._positiveInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
    }

    public destroy(): void {
        this._positiveInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveInput.off(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeInput.off(InputEvent.RELEASED, this.onInputUpdated, this);

        this._positiveInput.destroy();
        this._negativeInput.destroy();
    }

    public addPositiveBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveInput.addBinding(binding);
    }

    public removePositiveBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveInput.removeBinding(binding);
    }

    public removeAllPositiveBindings(): void {
        this._positiveInput.removeAllBindings();
    }

    public addNegativeBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeInput.addBinding(binding);
    }

    public removeNegativeBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeInput.removeBinding(binding);
    }

    public removeAllNegativeBindings(): void {
        this._negativeInput.removeAllBindings();
    }

    public removeAllBindings(): void {
        this.removeAllPositiveBindings();
        this.removeAllNegativeBindings();
    }

    private onInputUpdated() {
        const val = this.value;
        if (this.isHeld) {
            this.emit(InputEvent.PRESSED);
        }
        if (this._prevValue !== val) {
            this.emit(InputEvent.UPDATED, this._prevValue, val);
        }
        if (!this.isHeld) {
            this.emit(InputEvent.RELEASED);
        }
        this._prevValue = val;
    }
}

enum Vec2InputType {
    NONE,

    MOUSE_MOVE_DELTA,

    TOUCH_MOVE_DELTA,

    LEFT_STICK,
    RIGHT_STICK,
}

class Vec2Input extends EventTarget {

    private _isLocked: boolean = false;
    public get isLocked(): boolean { return this._isLocked; }
    public set isLocked(isLocked) {
        const wasHeld = this.isHeld;
        const wasLocked = this.isLocked;
        const oldValue = this.value;
        this._isLocked = isLocked;
        if (!wasLocked && this.isLocked) {
            if (wasHeld) {
                this.emit(InputEvent.UPDATED, oldValue, this.value);
                this.emit(InputEvent.RELEASED);
            }
            this.emit(InputEvent.LOCKED);
        } else if (wasLocked && !this.isLocked) {
            this.emit(InputEvent.UNLOCKED);
            if (this.isHeld) {
                this.emit(InputEvent.PRESSED);
                this.emit(InputEvent.UPDATED, oldValue, this.value);
            }
        }
    }

    private _bindings: Partial<Record<Vec2InputType, Vec2>>;
    public get value(): Vec2 {
        if (this.isLocked) {
            return Vec2.ZERO;
        }
        return Object.values(this._bindings).reduce((acc, val) => val.length() > acc.length() ? val : acc, Vec2.ZERO);
    }
    public get isHeld(): boolean {
        if (this.isLocked) {
            return false;
        }
        return this.value.length() !== 0;
    }

    constructor(binding: Vec2InputType|Vec2InputType[] = []) {
        super();
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        this._bindings = binding.reduce((acc, binding) => ({...acc, [binding]: Vec2.ZERO}), {});

        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        director.on(Director.EVENT_AFTER_UPDATE, this.onAfterUpdate, this);
    }

    public destroy(): void {
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        director.off(Director.EVENT_AFTER_UPDATE, this.onAfterUpdate, this);
    }

    public addBinding(binding: Vec2InputType|Vec2InputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) === 'object') {
                return;
            }
            this._bindings[binding] = Vec2.ZERO;
        });
    }

    public removeBinding(binding: Vec2InputType|Vec2InputType[]): void {
        if (!Array.isArray(binding)) {
            binding = [binding];
        }
        binding.forEach(binding => {
            if (typeof(this._bindings[binding]) !== 'object') {
                return;
            }
            this.release(binding);
            delete this._bindings[binding];
        });
    }

    public removeAllBindings(): void {
        this.removeBinding(Object.keys(this._bindings).map(key => Vec2InputType[key]));
    }

    private update(binding: Vec2InputType, value: Vec2) {
        if (value.length() === 0) {
            this.release(binding);
        }
        if (typeof(this._bindings[binding]) !== 'object') {
            return;
        }
        const wasHeld = this.isHeld;
        const oldValue = this.value;
        this._bindings[binding] = value;
        const newValue = this.value;
        if (!wasHeld && !this.isLocked) {
            this.emit(InputEvent.PRESSED);
        }
        if (!oldValue.strictEquals(newValue)) {
            this.emit(InputEvent.UPDATED, oldValue, newValue);
        }
    }

    private release(binding: Vec2InputType) {
        if (typeof(this._bindings[binding]) !== 'object') {
            return;
        }
        const wasHeld = this.isHeld;
        const oldValue = this.value;
        this._bindings[binding] = Vec2.ZERO;
        const newValue = this.value;
        if (!oldValue.strictEquals(newValue)) {
            this.emit(InputEvent.UPDATED, oldValue, newValue);
        }
        if (wasHeld && !this.isHeld) {
            this.emit(InputEvent.RELEASED);
        }
    }

    private onAfterUpdate(): void {
        this.release(Vec2InputType.MOUSE_MOVE_DELTA);
    }

    private onMouseMove(event: EventMouse) {
        this.update(Vec2InputType.MOUSE_MOVE_DELTA, event.getDelta());
    }
}

// TODO: Create Vec2Input_Vec1Composite

class Vec2Input_ButtonComposite extends EventTarget {

    private _isLocked: boolean = false;
    public get isLocked(): boolean { return this._isLocked; }
    public set isLocked(isLocked) {
        const wasHeld = this.isHeld;
        const wasLocked = this.isLocked;
        const oldValue = this.value;
        this._isLocked = isLocked;
        if (!wasLocked && this.isLocked) {
            if (wasHeld) {
                this.emit(InputEvent.UPDATED, oldValue, this.value);
                this.emit(InputEvent.RELEASED);
            }
            this.emit(InputEvent.LOCKED);
        } else if (wasLocked && !this.isLocked) {
            this.emit(InputEvent.UNLOCKED);
            if (this.isHeld) {
                this.emit(InputEvent.PRESSED);
                this.emit(InputEvent.UPDATED, oldValue, this.value);
            }
        }
    }

    public get value(): Vec2 {
        if (this.isLocked) {
            return Vec2.ZERO;
        }
        const positiveXValue = this._positiveXInput.isHeld ? 1 : 0;
        const negativeXValue = this._negativeXInput.isHeld ? -1 : 0;
        const positiveYValue = this._positiveYInput.isHeld ? 1 : 0;
        const negativeYValue = this._negativeYInput.isHeld ? -1 : 0;
        return new Vec2(positiveXValue + negativeXValue, positiveYValue + negativeYValue);
    }
    public get isHeld(): boolean {
        if (this.isLocked) {
            return false;
        }
        return this.value.length() !== 0;
    }

    private _positiveXInput: ButtonInput;
    private _negativeXInput: ButtonInput;
    private _positiveYInput: ButtonInput;
    private _negativeYInput: ButtonInput;
    private _prevValue: Vec2 = Vec2.ZERO;

    constructor(positiveXBinding: ButtonInputType|ButtonInputType[], negativeXBinding: ButtonInputType|ButtonInputType[], positiveYBinding: ButtonInputType|ButtonInputType[], negativeYBinding: ButtonInputType|ButtonInputType[]) {
        super();
        this._positiveXInput = new ButtonInput(positiveXBinding);
        this._negativeXInput = new ButtonInput(negativeXBinding);
        this._positiveYInput = new ButtonInput(positiveYBinding);
        this._negativeYInput = new ButtonInput(negativeYBinding);

        this._positiveXInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveXInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeXInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeXInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
        this._positiveYInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveYInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeYInput.on(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeYInput.on(InputEvent.RELEASED, this.onInputUpdated, this);
    }

    public destroy(): void {
        this._positiveXInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveXInput.off(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeXInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeXInput.off(InputEvent.RELEASED, this.onInputUpdated, this);
        this._positiveYInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._positiveYInput.off(InputEvent.RELEASED, this.onInputUpdated, this);
        this._negativeYInput.off(InputEvent.PRESSED, this.onInputUpdated, this);
        this._negativeYInput.off(InputEvent.RELEASED, this.onInputUpdated, this);

        this._positiveXInput.destroy();
        this._negativeXInput.destroy();
        this._positiveYInput.destroy();
        this._negativeYInput.destroy();
    }

    public addPositiveXBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveXInput.addBinding(binding);
    }

    public removePositiveXBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveXInput.removeBinding(binding);
    }

    public removeAllPositiveXBindings(): void {
        this._positiveXInput.removeAllBindings();
    }

    public addNegativeXBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeXInput.addBinding(binding);
    }

    public removeNegativeXBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeXInput.removeBinding(binding);
    }

    public removeAllNegativeXBindings(): void {
        this._negativeXInput.removeAllBindings();
    }

    public addPositiveYBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveYInput.addBinding(binding);
    }

    public removePositiveYBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._positiveYInput.removeBinding(binding);
    }

    public removeAllPositiveYBindings(): void {
        this._positiveYInput.removeAllBindings();
    }

    public addNegativeYBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeYInput.addBinding(binding);
    }

    public removeNegativeYBinding(binding: ButtonInputType|ButtonInputType[]): void {
        this._negativeYInput.removeBinding(binding);
    }

    public removeAllNegativeYBindings(): void {
        this._negativeYInput.removeAllBindings();
    }

    public removeAllBindings(): void {
        this.removeAllPositiveXBindings();
        this.removeAllNegativeXBindings();
        this.removeAllPositiveYBindings();
        this.removeAllNegativeYBindings();
    }

    private onInputUpdated() {
        const val = this.value;
        if (this.isHeld) {
            this.emit(InputEvent.PRESSED);
        }
        if (this._prevValue !== val) {
            this.emit(InputEvent.UPDATED, this._prevValue, val);
        }
        if (!this.isHeld) {
            this.emit(InputEvent.RELEASED);
        }
        this._prevValue = val;
    }
}

export enum InputEvent {
    LOCKED,
    UNLOCKED,
    PRESSED,
    RELEASED,
    UPDATED,
}

export enum ActionType {
    LOOK,
    MOVE,
    PRIMARY,
    SECONDARY,
    JUMP,
    SPRINT,
    CROUCH,
    INTERACT,
    MENU,
};

@ccclass('PlayerInput')
export class PlayerInput extends Component {

    // TODO: Move this to read from a file that can be changed in settings
    private _actions: Partial<Record<ActionType, ButtonInput|Vec1Input|Vec1Input_ButtonComposite|Vec2Input|Vec2Input_ButtonComposite>> = {
        [ActionType.LOOK]: new Vec2Input(Vec2InputType.MOUSE_MOVE_DELTA),
        [ActionType.MOVE]: new Vec2Input_ButtonComposite(ButtonInputType.KEY_D, ButtonInputType.KEY_A, ButtonInputType.KEY_S, ButtonInputType.KEY_W),
        [ActionType.PRIMARY]: new ButtonInput(ButtonInputType.LEFT_MOUSE),
        [ActionType.SECONDARY]: new ButtonInput(ButtonInputType.RIGHT_MOUSE),
        [ActionType.JUMP]: new ButtonInput(ButtonInputType.SPACE),
        [ActionType.INTERACT]: new ButtonInput(ButtonInputType.KEY_E),
        [ActionType.SPRINT]: new ButtonInput(ButtonInputType.LEFT_SHIFT),
        [ActionType.CROUCH]: new ButtonInput(ButtonInputType.LEFT_CTRL),
        [ActionType.MENU]: new ButtonInput([ButtonInputType.ESCAPE, ButtonInputType.TAB, ButtonInputType.BACKSPACE]),
    };
    public get actions() { return this._actions; }

    protected onDestroy() {
        Object.values(this.actions).forEach(input => input.destroy());
    }
}