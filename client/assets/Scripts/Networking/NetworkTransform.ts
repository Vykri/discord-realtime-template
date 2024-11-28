import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('NetworkTransform')
export class NetworkTransform extends Component {

    @property private syncRate = 100;

    protected start(): void {
        
    }
}