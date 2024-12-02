import { _decorator, Vec3 } from 'cc';
import { NetworkComponent } from './NetworkComponent';
import { NetworkManager } from './NetworkManager';
import { NetworkIdentity } from './NetworkIdentity';
import { ClientToServerCommand, ObjectDiffPacket, ObjectPacket } from './PacketTypes';
const { ccclass, property } = _decorator;

@ccclass('NetworkTransform')
export class NetworkTransform extends NetworkComponent {

    @property private syncRate: number = 0.015625; // 64 ticks per second

    private _identity: NetworkIdentity;

    private _syncTimer: number = 0;

    protected start(): void {
        this._identity = this.node.getComponent(NetworkIdentity);
    }

    protected update(dt: number): void {
        if (!this.isOwner) {
            return;
        }

        this._syncTimer -= dt;
        if (this._syncTimer < 0) {
            this._syncTimer = this.syncRate;
            NetworkManager.instance.sendToServer(ClientToServerCommand.UPDATE_COMPONENT, {
                id: this._identity.id,
                transform: {
                    pos: {
                        x: this.node.position.x,
                        y: this.node.position.y,
                        z: this.node.position.z,
                    },
                    rot: {
                        x: this.node.eulerAngles.x,
                        y: this.node.eulerAngles.y,
                        z: this.node.eulerAngles.z,
                    },
                },
            });
            this._syncTimer = this.syncRate;
        }
    }

    public onSync(data: ObjectPacket, t: number = 0): void {
        if (this.isOwner) {
            return;
        }

        if (t < this.lastUpdate) {
            return;
        }

        const { pos, rot } = data.transform;
        this.node.setWorldPosition(new Vec3(pos.x, pos.y, pos.z));
        this.node.setRotationFromEuler(new Vec3(rot.x, rot.y, rot.z));

        this.lastUpdate = t;
    }

    public onStateUpdate(data: ObjectDiffPacket, t: number = 0): void {
        if (this.isOwner) {
            return;
        }
        
        if (t < this.lastUpdate) {
            return;
        }

        const { pos, rot } = data.transform;

        const posX = typeof(pos?.x) === 'number' ? pos.x : this.node.worldPosition.x;
        const posY = typeof(pos?.y) === 'number' ? pos.y : this.node.worldPosition.y;
        const posZ = typeof(pos?.z) === 'number' ? pos.z : this.node.worldPosition.z;

        const rotX = typeof(rot?.x) === 'number' ? rot.x : this.node.eulerAngles.x;
        const rotY = typeof(rot?.y) === 'number' ? rot.y : this.node.eulerAngles.y;
        const rotZ = typeof(rot?.z) === 'number' ? rot.z : this.node.eulerAngles.z;

        this.node.setWorldPosition(new Vec3(posX, posY, posZ));
        this.node.setRotationFromEuler(new Vec3(rotX, rotY, rotZ));

        this.lastUpdate = t;
    }
}