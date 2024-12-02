import { IVec3Like } from "cc";

export enum ClientToServerCommand {
    SYNC_REQUEST = 'C2S_SYNC_REQUEST',
    UPDATE_COMPONENT = 'C2S_UPDATE_COMPONENT',
}

export enum ServerToClientCommand {
    SYNC = 'S2C_SYNC',
    CONNECT = 'S2C_CONNECT',
    JOIN = 'S2C_JOIN',
    LEAVE = 'S2C_LEAVE',
    INSTANTIATE = 'S2C_INSTANTIATE',
    DESTROY = 'S2C_DESTROY',
    STATE_UPDATE = 'S2C_STATE_UPDATE',
}

export enum NetworkObjectType {
    PLAYER = 'PLAYER',
};

export type PlayerPacket = {
    id: number,
};

export type Vec3Packet = {
    x?: number,
    y?: number,
    z?: number,
}

export type TransformPacket = {
    pos?: Vec3Packet,
    rot?: Vec3Packet,
};

export type ObjectPacket = {
    type: NetworkObjectType,
    id: number,
    ownerId: number,
    transform?: TransformPacket,
};

export type StatePacket = {
    players: PlayerPacket[],
    objs: ObjectPacket[],
};

export type SyncPacket = {
    state: StatePacket,
};

export type ConnectPacket = {
    id: number,
    state: StatePacket,
};

export type JoinPacket = {
    id: number,
};

export type LeavePacket = {
    id: number,
};

export type InstantiatePacket = {
    obj: ObjectPacket,
};

export type DestroyPacket = {
    id: number|number[],
};

export type ObjectDiffPacket = {
    transform?: TransformPacket,
};

export type DiffPacket = {
    objs?: Record<number, ObjectDiffPacket>,
};

export type StateUpdatePacket = {
    diff?: DiffPacket,
};

export type ServerToClientMessagePacket = {
    t: number,
    cmd: ServerToClientCommand,
    data?: SyncPacket|ConnectPacket|JoinPacket|LeavePacket|InstantiatePacket|DestroyPacket,
};