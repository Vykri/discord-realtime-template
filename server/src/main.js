const ws = require('nodejs-websocket');

let server = ws.createServer(conn => {
    conn.on('text', text => {
        const textObj = JSON.parse(text);
        let data;
        if (textObj.data) {
            data = JSON.parse(textObj.data);
        }

        switch (textObj.cmd) {
            case 'JOIN':
                break;
        }
    });

    conn.on('error', error => {
        console.log('error', error);
    });

    conn.on('close', code => {
        console.log('close', code);
    });
});

const send = (conn, cmd, data) => {
    var msgObj = {};
    msgObj.cmd = cmd;
    if (data) {
        msgObj.data = JSON.stringify(data);
    }
    conn.sendText(JSON.stringify(msgObj))
};

const broadcast = (cmd, data) => server.connections.forEach(conn => send(conn, cmd, data));

server.listen(process.argv[2] || 1211);