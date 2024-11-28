import { _decorator, Component, Node, Vec3 } from 'cc';
import { NetworkComponent } from './NetworkComponent';
import { ClientToServerCommand, NetworkManager } from './NetworkManager';
const { ccclass, property } = _decorator;

@ccclass('NetworkTransform')
export class NetworkTransform extends NetworkComponent {

    @property private syncRate: number = 0.1;

    private _syncTimer: number = 0;

    protected update(dt: number): void {
        if (!this.isOwner) {
            return;
        }

        this._syncTimer -= dt;
        if (this._syncTimer < 0) {
            this._syncTimer = this.syncRate;
            NetworkManager.instance.sendToServer(ClientToServerCommand.UPDATE_NETWORK_TRANSFORM, {
                t: Date.now(),
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
            });
        }
    }

    public onUpdate(pos: Vec3, rot: Vec3) {
        this.node.setWorldPosition(pos);
        this.node.setRotationFromEuler(rot);
    }
}