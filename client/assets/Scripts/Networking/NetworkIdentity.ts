import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('NetworkIdentity')
export class NetworkIdentity extends Component {

    private _identity: number = 0;
    public get id(): number { return this._identity; }
    public set id(val) { if (this.id === 0) this._identity = val; }

    protected start(): void {
        if (this.id === 0) {
            console.warn(`Tried to instantiate Network object without an identity. Destroying.`);
            this.node.destroy();
        }
    }
}