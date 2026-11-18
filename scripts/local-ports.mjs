import net from 'node:net';

export const defaultPort = 8787;
export const parallelPort = 8827;
export const workspacePorts = [defaultPort, defaultPort + 1, parallelPort, parallelPort + 1, 5173];

export async function firstBusyPort(ports = workspacePorts) {
    for (const port of ports) {
        const active = await new Promise(resolve => {
            const socket = net.createConnection({host: '127.0.0.1', port});
            const done = value => { socket.destroy(); resolve(value); };
            socket.setTimeout(500, () => done(false));
            socket.once('connect', () => done(true));
            socket.once('error', () => done(false));
        });
        if (active) return port;
    }
    return null;
}
