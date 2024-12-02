import { createServer } from 'https';
import WebSocket, { WebSocketServer } from 'ws';

const TICK_RATE = (1 / 64) * 1000;

const SPAWN_POINTS = [
    { pos: { x: -5, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 } },
    { pos: { x: 0, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 } },
    { pos: { x: 5, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 } },
];

/*
if (!process.env.WSS_CERT) {
    console.error("Please supply a secure websocket certificate in env.WSS_CERT");
    return;
}
if (!process.env.WSS_KEY) {
    console.error("Please supply the secure websocket certificate key in env.WSS_KEY");
    return;
}
if (!process.env.WSS_PORT) {
    console.error("Please supply a port in env.WSS_PORT");
    return;
}
*/

// TODO: Get cert and move to wss
/*
const server = createServer({
    //cert: process.env.WSS_CERT,
    //key: process.env.WSS_KEY,
});
*/
const wss = new WebSocketServer({ port:1211 });

let state = {
    players: {},
    objs: {},
};
let prevState = structuredClone(state);
let diff = {};
let spawnIndex = 0;
let nextPlayerId = 1;
let nextObjId = 1;
const startTime = Date.now();

wss.on('connection', ws => {
    ws.on('error', console.error);
    ws.on('close', () => onPlayerDisconnect(ws));
    ws.on('message', msg => onMessage(ws, msg));

    onPlayerConnect(ws);
});

const onTick = () => {
    if (!Object.keys(diff).length) {
        return;
    }

    sendToAll('S2C_STATE_UPDATE', { diff });
    prevState = structuredClone(state);
    diff = {};
};

const onPlayerConnect = ws => {
    const id = nextPlayerId++;
    ws.id = id;
    state.players[id] = { id, objs: [] };

    send(ws, 'S2C_CONNECT', { id, state: getStatePacket() });
    sendToAll('S2C_JOIN', { id });
    sendToAll('S2C_INSTANTIATE', { obj: createPlayerObj(id) });
};

const onPlayerDisconnect = ws => {
    const { id, objs } = state.players[ws.id];
    delete state.players[id];

    sendToAll('S2C_LEAVE', { id });
    sendToAll('S2C_DESTROY', { id: objs });
};

const onMessage = (ws, msg) => {
    const { cmd, data } = JSON.parse(msg);

    if (!cmd) {
        return;
    }

    switch (cmd) {
        case 'C2S_SYNC_REQUEST': {
            send(ws, 'S2C_SYNC', { state: getStatePacket() })
            break;
        }
        case 'C2S_UPDATE_COMPONENT': {
            const { id, ...components } = data;
            let obj = state.objs[id];
            if (obj.ownerId !== ws.id) {
                return;
            }
            diff = Object.entries(components).reduce((acc, [component, update]) => {
                let curVal = obj[component];
                if (typeof(curVal) === 'undefined') {
                    return acc;
                }
                const componentDiff = getDiff(curVal, update);

                return {
                    ...acc,
                    ...{
                        objs: {
                            ...acc?.objs,
                            [id]: {
                                ...acc?.objs?.[id],
                                [component]: {
                                    ...acc?.objs?.[id]?.[component],
                                    ...componentDiff,
                                },
                            },
                        },
                    },
                };
            }, diff);

            // TODO: Validate inputs, this overrides entire objects even if some fields are missing
            state.objs[id] = {
                ...obj,
                ...components,
            };
            break;
        }
        default: {
            console.warn(`Client attempted to send server ${cmd}, but server does not recognize the command`);
            break;
        }
    }
};

const getStatePacket = () => ({
    players: Object.values(prevState.players).map(({id}) => ({id})),
    objs: Object.values(prevState.objs),
});

const getDiff = (curVal, update) => {
    return Object.entries(update).reduce((acc, [k, v]) => {
        if (typeof(v) === 'object') {
            const diff = getDiff(curVal[k], v);
            if (Object.keys(diff).length) {
                return {
                    ...acc,
                    [k]: diff,
                };
            }
        } else if (curVal[k] !== v) {
            return {
                ...acc,
                [k]: v,
            };
        }
        return acc;
    }, {});
};

const createPlayerObj = ownerId => {
    const id = nextObjId++;

    const transform = SPAWN_POINTS[spawnIndex];
    spawnIndex = (spawnIndex + 1) % SPAWN_POINTS.length;

    const obj = {
        type: 'PLAYER',
        id,
        ownerId,
        transform,
    };

    state.objs[id] = obj;
    state.players[ownerId].objs.push(id);

    return obj;
};

const send = async (ws, cmd, data) => {
    if (ws.readyState !== WebSocket.OPEN) {
        console.error(`ws was not open`);
        return;
    }
    ws.send(JSON.stringify({
        t: Date.now() - startTime,
        cmd,
        data,
    }));
};

const sendToAll = (cmd, data) => wss.clients.forEach(ws => send(ws, cmd, data));

setInterval(onTick, TICK_RATE);