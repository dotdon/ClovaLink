import { Server } from 'socket.io';

declare global {
    var io: Server | undefined;
    namespace NodeJS {
        interface Global {
            io: Server | undefined;
        }
    }
} 