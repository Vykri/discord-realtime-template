import { _decorator, Component } from 'cc';
import { NetworkManager } from './NetworkManager';
const { ccclass } = _decorator;

@ccclass('NetworkIdentity')
export class NetworkIdentity extends Component {

    private _identity: string;
    public get id(): string { return this._identity; }
    private set id(val) { this._identity = val; }
}