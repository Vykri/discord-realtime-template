import { createServer } from 'https';
import WebSocket, { WebSocketServer } from 'ws';

const SPAWN_POINTS = [
    {
        x: -5,
        y: 0,
        z: 0,
    },
    {
        x: 0,
        y: 0,
        z: 0,
    },
    {
        x: 5,
        y: 0,
        z: 0,
    },
];

if (!process.env.WSS_CERT) {
    console.error("Please supply a secure websocket certificate in env.WSS_CERT");
    return;
}
if (!process.env.WSS_KEY) {
    console.error("Please supply a secure websocket key in env.WSS_KEY");
    return;
}
if (!process.env.WSS_PORT) {
    console.error("Please supply a port in env.WSS_PORT");
    return;
}

let state = {
    players: [],
    objs: {},
};
let spawnIndex = 0;

const server = createServer({
    cert: process.env.WSS_CERT,
    key: process.env.WSS_KEY,
});
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.on('error', console.error);

    ws.on('message', msg => {
        const { cmd, data } = JSON.parse(msg);
        if (!cmd) {
            return;
        }

        switch (cmd) {
            case 'C2S_SYNC_REQUEST':
                send(ws, 'S2C_SYNC', { state })
                break;
            case 'C2S_UPDATE_COMPONENT':
                const obj = state.objs[data.id];
                if (obj.ownerId !== ws.id) {
                    return;
                }
                // TODO: Validate inputs
                obj = {
                    ...obj,
                    ...data,
                };
                break;
            default:
                break;
        }
    });

    const id = crypto.randomUUID();
    ws.id = id;
    state.players.push(ws.id);

    send(ws, 'S2C_CONNECT', {
        id,
        state,
    });

    state.players.push(id);

    sendToAll('S2C_JOIN', { id });

    sendToAll('S2C_INSTANTIATE', {
        type: 'PLAYER',
        obj: createPlayer(id),
    });
});

const createPlayer = ownerId => {
    const id = crypto.randomUUID();

    const transform = SPAWN_POINTS[spawnIndex];
    spawnIndex = (spawnIndex + 1) % SPAWN_POINTS.length;

    const obj = {
        id,
        ownerId,
        transform,
    };

    state.objs[id] = obj;

    return obj;
};

const send = async (ws, cmd, data) => {
    if (ws.readyState !== WebSocket.OPEN) {
        return;
    }
    ws.send(JSON.stringify({
        t: Date.now(),
        cmd,
        data,
    }));
};

const sendToAll = async (cmd, data) => await Promise.allSettled([...wss.clients.map(async ws => send(ws, cmd, data))]);

server.listen(process.env.WSS_PORT);