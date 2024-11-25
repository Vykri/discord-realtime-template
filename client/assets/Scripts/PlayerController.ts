import { _decorator, Component, Vec3, RigidBody, Vec2, Camera, ICollisionEvent, CapsuleCollider, Quat, PhysicsSystem } from 'cc';
import { ActionType, PlayerInput, InputEvent } from './PlayerInput';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property(Camera) private camera: Camera;
    @property private moveSpeed: number = 5;
    @property private jumpHeight: number = 2;
    @property private minCamXRotation: number = -89;
    @property private maxCamXRotation: number = 89;

    private _input: PlayerInput;
    private _rb: RigidBody;
    private _collider: CapsuleCollider;
    
    private _camOffset: Vec3;
    private _camYRotation: number = 0;
    private _camXRotation: number = 0;
    private _isGrounded: boolean = false;

    protected start(): void {
        this._input = this.node.getComponent(PlayerInput);
        this._rb = this.node.getComponent(RigidBody);
        this._collider = this.node.getComponent(CapsuleCollider);

        this.camera.node.setParent(this.node.parent);
        this._camOffset = this.camera.node.position.clone().subtract(this.node.position);

        this._collider.on('onCollisionStay', this.onCollisionStay, this);
        this._collider.on('onCollisionExit', this.onCollisionExit, this);
        this._input.actions[ActionType.JUMP].on(InputEvent.PRESSED, this.onJump, this);
    }

    protected update(dt: number): void {
        this.handleMovement();
        this.handleCamera();
    }

    protected lateUpdate(dt: number): void {
        this.applyCamera();
    }

    protected onDestroy(): void {
        this._collider.off('onCollisionStay', this.onCollisionStay, this);
        this._collider.off('onCollisionExit', this.onCollisionExit, this);
        this._input.actions[ActionType.JUMP].off(InputEvent.PRESSED, this.onJump, this);
    }

    private handleMovement() {
        let movement = new Vec3();
        this._rb.getLinearVelocity(movement);

        const moveInput = this._input.actions[ActionType.MOVE].value as Vec2;
        const moveVec = new Vec3(moveInput.x, 0, moveInput.y).normalize().multiplyScalar(this.moveSpeed);
        movement = new Vec3(moveVec.x, movement.y, moveVec.z);

        this._rb.setLinearVelocity(movement);
    }

    private handleCamera() {
        const lookInput = this._input.actions[ActionType.LOOK].value as Vec2;

        this._camYRotation -= lookInput.x;
        if (this._camYRotation >= 360) {
            this._camYRotation -= 360;
        } else if (this._camYRotation < 0) {
            this._camYRotation += 360;
        }

        this._camXRotation += lookInput.y;
        if (this._camXRotation > this.maxCamXRotation) {
            this._camXRotation = this.maxCamXRotation;
        } else if (this._camXRotation < this.minCamXRotation) {
            this._camXRotation = this.minCamXRotation;
        }
    }

    private applyCamera() {
        // TODO: This does not properly rotate the camera around the player
        this.node.setRotationFromEuler(0, this._camYRotation, 0);
        this.camera.node.setRotationFromEuler(this._camXRotation, 0, 0);
    }

    private onCollisionStay(event: ICollisionEvent) {
        event.contacts.forEach(contact => {
            let normal = new Vec3();
            contact.getWorldNormalOnB(normal);
            if (Vec3.angle(normal, Vec3.UP) < 60) {
                this._isGrounded = true;
            }
        });
    }

    private onCollisionExit() {
        this._isGrounded = false;
    }

    private onJump() {
        if (!this._isGrounded) {
            return;
        }
        let vel = new Vec3();
        this._rb.getLinearVelocity(vel);
        this._rb.setLinearVelocity(new Vec3(vel.x, Math.sqrt(2 * this.jumpHeight * -PhysicsSystem.instance.gravity.y), vel.z));
        this._isGrounded = false;
    }
}