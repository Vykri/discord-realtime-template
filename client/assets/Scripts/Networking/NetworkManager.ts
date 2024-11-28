import { _decorator, Component, director, instantiate, Prefab } from 'cc';
import { SERVER_WEBSOCKET_URL } from '../Util/Settings';
const { ccclass, property } = _decorator;

export enum ClientToServerCommand {
    JOIN,
    UPDATE_NETWORK_TRANSFORM,
}

export enum ServerToClientCommand {
    JOIN_SUCCESS,
}

@ccclass('NetworkManager')
export class NetworkManager extends Component {

    @property(Prefab) private playerPrefab: Prefab;

    private _ws: WebSocket;

    private static _instance: NetworkManager;
    public static get instance(): NetworkManager { return this._instance; }
    private static set instance(val) { this._instance = val; }

    protected start(): void {
        if (NetworkManager.instance) {
            this.destroy();
            return;
        }
        NetworkManager.instance = this;

        this.connectToServer();
    }

    protected onDestroy(): void {
        if (NetworkManager.instance === this) {
            NetworkManager.instance = null;
        }
    }

    public sendToServer(cmd: ClientToServerCommand, data: Object = {}): void {
        this._ws.send(JSON.stringify({
            cmd,
            data: JSON.stringify(data),
        }));
    }

    private connectToServer() {
        this._ws = new WebSocket(SERVER_WEBSOCKET_URL);
        this._ws.onmessage = event => {
            const msgObj = JSON.parse(event.data);
            const data = JSON.parse(msgObj.data)

            switch (msgObj.cmd) {
                case ServerToClientCommand.JOIN_SUCCESS:
                    // TODO: OnJoinSuccess
                    break;
            }
        };
        this._ws.onopen = () => {
            this.sendToServer(ClientToServerCommand.JOIN);
        };
    }

    private onPlayerJoin() {
        const player = instantiate(this.playerPrefab);
        player.parent = director.getScene();
    }
}