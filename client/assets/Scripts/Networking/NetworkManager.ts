import { _decorator, Component, director, instantiate, Node, Prefab } from 'cc';
import { SERVER_WEBSOCKET_URL } from '../Util/Settings';
import { NetworkIdentity } from './NetworkIdentity';
import { NetworkComponent } from './NetworkComponent';
import { ClientToServerCommand, ConnectPacket, DestroyPacket, InstantiatePacket, JoinPacket, LeavePacket, NetworkObjectType, ObjectPacket, PlayerPacket, ServerToClientCommand, ServerToClientMessagePacket, StateUpdatePacket, SyncPacket } from './PacketTypes';
const { ccclass, property } = _decorator;

@ccclass('NetworkManager')
export class NetworkManager extends Component {

    @property(Prefab) private playerPrefab: Prefab;

    private static _instance: NetworkManager;
    public static get instance(): NetworkManager { return this._instance; }
    private static set instance(val) { this._instance = val; }

    private _playerId: number = 0;
    public get playerId(): number { return this._playerId; }

    private _ws: WebSocket;
    private _connected: boolean = false;
    private _syncingLocks: boolean[] = [];
    private _players: Record<number, PlayerPacket> = {};
    private _objs: Record<number, NetworkIdentity> = {};
    private _pendingMsgs: ServerToClientMessagePacket[] = [];

    protected start(): void {
        if (NetworkManager.instance) {
            this.destroy();
            return;
        }
        NetworkManager.instance = this;

        this.connectToServer();
    }

    protected onDestroy(): void {
        this._ws.close();
        if (NetworkManager.instance === this) {
            NetworkManager.instance = null;
        }
    }

    public sendToServer(cmd: ClientToServerCommand, data: Object = {}): void {
        if (!this._connected) {
            console.warn(`Attempted to send ${ClientToServerCommand[cmd]} to the server, but the WebSocket isn't connected`);
            return;
        }
        this._ws.send(JSON.stringify({
            cmd,
            data,
        }));
    }

    private connectToServer() {
        this._ws = new WebSocket(SERVER_WEBSOCKET_URL);
        this._ws.onmessage = event => this.onMessage(JSON.parse(event.data));
        this._ws.onopen = () => this._connected = true;
        this._ws.onclose = () => this._connected = false;
    }

    private onMessage(msg: ServerToClientMessagePacket) {
        if (this._syncingLocks.length > 0) {
            this._pendingMsgs.push(msg);
            return;
        }

        const { t, cmd, data } = msg;

        switch (cmd) {
            case ServerToClientCommand.SYNC:
                this.onSync(data as SyncPacket, t);
                break;
            case ServerToClientCommand.CONNECT:
                this.onConnect(data as ConnectPacket, t);
                break;
            case ServerToClientCommand.JOIN:
                this.onJoin(data as JoinPacket, t);
                break;
            case ServerToClientCommand.LEAVE:
                this.onLeave(data as LeavePacket, t);
                break;
            case ServerToClientCommand.INSTANTIATE:
                this.onInstantiate(data as InstantiatePacket, t);
                break;
            case ServerToClientCommand.DESTROY:
                this.onDestroyObj(data as DestroyPacket, t);
                break;
            case ServerToClientCommand.STATE_UPDATE:
                this.onStateUpdate(data as StateUpdatePacket, t);
                break;
        }
    }

    private onSync(data: SyncPacket, t: number) {
        this._syncingLocks.push(true);
        const { players, objs } = data.state;
        players.forEach(player => this.addPlayer(player, t));
        objs.forEach(obj => this.instantiateObj(obj, t));
        while (this._pendingMsgs.length > 0) {
            this.onMessage(this._pendingMsgs.shift());
        }
        this._syncingLocks.pop();
    }

    private onConnect(data: ConnectPacket, t: number) {
        this._playerId = data.id;
        this.onSync(data, t);
    }

    private onJoin(data: JoinPacket, t: number) {
        this.addPlayer(data, t);
    }

    private onLeave(data: LeavePacket, t: number) {
        this.removePlayer(data, t);
    }

    private onInstantiate(data: InstantiatePacket, t: number) {
        this.instantiateObj(data.obj, t);
    }

    private onDestroyObj(data: DestroyPacket, t: number) {
        const ids = Array.isArray(data.id) ? data.id : [data.id];
        ids.forEach(id => this.destroyObj(id, t));
    }

    private onStateUpdate(data: StateUpdatePacket, t: number) {
        Object.entries(data.diff.objs).forEach(([id, objDiff]) => this._objs[id].node.getComponentsInChildren(NetworkComponent).forEach(component => component.onStateUpdate(objDiff, t)));
    }

    private addPlayer(data: PlayerPacket, t: number) {
        this._players[data.id] = data;
    }

    private removePlayer(data: LeavePacket, t: number) {
        delete this._players[data.id];
    }

    private instantiateObj(data: ObjectPacket, t: number) {
        let identity: NetworkIdentity = this._objs[data.id];
        let obj: Node = identity?.node;

        if (!obj) {
            switch (data.type) {
                case NetworkObjectType.PLAYER:
                    obj = instantiate(this.playerPrefab);
                    break;
                default:
                    console.warn(`Server told client to instantiate obj of type ${data.type}, but that prefab isn't set on NetworkManager.`)
                    return;
            }

            identity = obj.getComponent(NetworkIdentity);
            identity.id = data.id;

            this._objs[data.id] = identity;
            obj.parent = director.getScene();
        }

        obj.getComponentsInChildren(NetworkComponent).forEach(component => {
            component.isOwner = this.playerId === data.ownerId;
            component.onSync(data, t);
        });
    }

    private destroyObj(id: number, t: number) {
        let identity: NetworkIdentity = this._objs[id];
        let obj: Node = identity?.node;
        obj?.destroy();
        delete this._objs[id];
    }
}