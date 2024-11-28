import { _decorator, Component, director, instantiate, Prefab } from 'cc';
import { SERVER_WEBSOCKET_URL } from '../Util/Settings';
const { ccclass, property } = _decorator;

enum ClientToServerCommand {
    JOIN,
}

enum ServerToClientCommand {
    JOIN_SUCCESS,
}

@ccclass('NetworkManager')
export class NetworkManager extends Component {

    @property(Prefab) private playerPrefab: Prefab;

    private _ws: WebSocket;

    public static get isServer(): boolean {
        return true;
    }

    protected start(): void {
        if (NetworkManager.isServer) {

        } else {
            this.connectToServer();
        }
    }

    // Server //

    private serverOnJoin(data: Object) {
        const player = instantiate(this.playerPrefab);
        player.parent = director.getScene();
    }

    // Client //

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
}