import { _decorator, Component } from 'cc';
import { NetworkIdentity } from './NetworkIdentity';
const { ccclass, requireComponent } = _decorator;

@ccclass('NetworkComponent')
@requireComponent(NetworkIdentity)
export class NetworkComponent extends Component {

    public isOwner: boolean = false;
}