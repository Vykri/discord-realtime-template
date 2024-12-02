import { _decorator, Component } from 'cc';
import { NetworkIdentity } from './NetworkIdentity';
import { ObjectDiffPacket, ObjectPacket } from './PacketTypes';
const { ccclass, requireComponent } = _decorator;

@ccclass('NetworkComponent')
@requireComponent(NetworkIdentity)
export abstract class NetworkComponent extends Component {

    public isOwner: boolean = false;

    protected lastUpdate: number = 0;

    public onSync(data: ObjectPacket, t: number = 0): void { }
    public onStateUpdate(data: ObjectDiffPacket, t: number = 0): void { }
}