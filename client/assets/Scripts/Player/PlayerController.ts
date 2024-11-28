import { _decorator, Component, Vec3, RigidBody, Vec2, Camera, ICollisionEvent, CapsuleCollider, PhysicsSystem, Node } from 'cc';
import { ActionType, PlayerInput, InputEvent } from './PlayerInput'
const { ccclass, property } = _decorator;

const DEGREES_TO_RADIANS_CONVERSTION_FACTOR = Math.PI / 180;

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
    
    private _camDist: number;
    private _camHeightOffset: Vec3;
    private _camYRotation: number = 0;
    private _camXRotation: number = 0;
    private _isGrounded: boolean = false;

    protected start(): void {
        this._input = this.node.getComponent(PlayerInput);
        this._rb = this.node.getComponent(RigidBody);
        this._collider = this.node.getComponent(CapsuleCollider);

        this.camera.node.setParent(this.node.parent);
        this._camDist = this.camera.node.position.z;
        this._camHeightOffset = new Vec3(0, this.camera.node.position.y, 0);

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
        let prevVel = new Vec3();
        this._rb.getLinearVelocity(prevVel);

        const moveInput = this._input.actions[ActionType.MOVE].value as Vec2;
        let moveVec = new Vec3(moveInput.x, 0, moveInput.y).normalize().multiplyScalar(this.moveSpeed);
        Vec3.rotateY(moveVec, moveVec, Vec3.ZERO, this.camera.node.eulerAngles.y * DEGREES_TO_RADIANS_CONVERSTION_FACTOR);
        moveVec = new Vec3(moveVec.x, prevVel.y, moveVec.z);

        this._rb.setLinearVelocity(moveVec);
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
        this.node.setRotationFromEuler(0, this._camYRotation, 0);
        
        // TODO: There is probably a better way of getting a forward vector from euler angles than making a node
        const pivot = new Node();
        pivot.setRotationFromEuler(this._camXRotation, this._camYRotation, 0);
        let camPos = pivot.forward.clone()
                .multiplyScalar(-this._camDist)
                .add(this._camHeightOffset)
                .add(this.node.worldPosition);
        pivot.destroy();

        this.camera.node.setWorldPosition(camPos);
        this.camera.node.lookAt(this.node.worldPosition.clone().add(this._camHeightOffset));
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