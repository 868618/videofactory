import { Worker, Cluster } from 'cluster';

interface ICore {
    (options: IOptions): ICoreInstance;
}
interface ICoreInstance {
    go: () => Promise<unknown>;
}
interface IOptions {
    maxEngines: number;
    mode: 'infinite' | 'single' | 'manual';
    data: () => Promise<unknown[]>;
    timer?: boolean;
    tasks: ((data: unknown, worker?: Worker) => Promise<unknown>)[];
    singleton?: (cluster: Cluster) => any;
    main?: (cluster: Cluster, worker: Worker, singletonInstance: any) => void;
    monitor?: {
        letter?: (worker: Worker | undefined, message: unknown) => Promise<void>;
        error?: (error: unknown, worker?: Worker, message?: unknown) => void;
        masterExit?: (dataSource: unknown[]) => void;
        workerExit?: (worker?: Worker) => void;
        wave?: (worker: Worker | undefined, message: unknown) => void;
    };
}
declare const fire: ICore;

export { fire as default };
