import cluster, { type Worker, Cluster } from 'cluster'
import { clone } from 'lodash'

// import os from 'os'

interface ICore {
  (options: IOptions): ICoreInstance
}

interface ICoreInstance {
  go: () => Promise<unknown>
}

interface IOptions {
  maxEngines: number

  mode: 'infinite' | 'single' | 'manual'

  data: () => Promise<unknown[]>

  timer?: boolean

  // tasks: ((data: unknown, close?: () => void) => Promise<unknown>)[]
  tasks: ((data: unknown, worker?: Worker) => Promise<unknown>)[]

  singleton?: (cluster: Cluster) => unknown

  main?: (cluster: Cluster, worker: Worker, singletonInstance: unknown) => void

  monitor?: {
    letter?: (worker: Worker | undefined, message: unknown) => Promise<void>

    error?: (error: unknown, worker?: Worker, message?: unknown) => void

    masterExit?: (dataSource: unknown[]) => void

    workerExit?: (worker?: Worker) => void

    wave?: (worker: Worker | undefined, message: unknown) => void
  }
}

const fire: ICore = options => {
  return {
    async go() {
      const {
        maxEngines,
        data,
        monitor,
        tasks,
        timer,
        mode = 'infinite',
        main,
        singleton,
      } = options

      timer && console.time('共计用时：')
      let dataSource: unknown[]
      let dataBack: unknown[]

      if (cluster.isPrimary) {
        dataSource = await data()

        dataBack = clone(dataSource)

        const singletonInstance = singleton?.(cluster)

        Array.from({ length: maxEngines }).forEach(() => cluster.fork())

        cluster.on('online', worker => {
          main && main(cluster, worker, singletonInstance)

          worker.on('message', ({ type }) => {
            if (type == 'getData') {
              if (dataSource.length) {
                worker.send({
                  type: 'supply',
                  payload: dataSource.shift(),
                })
              } else {
                worker.kill()
              }
            }
          })
        })

        // 子进程退出时候的监听
        cluster.on('exit', worker => {
          monitor?.workerExit && monitor.workerExit(worker)

          if (dataSource.length && ['single', 'manual'].includes(mode)) {
            cluster.fork()
          }
        })

        process.on('beforeExit', async () => {
          monitor?.masterExit && monitor.masterExit(dataBack)
        })

        process.on('exit', async () => {
          timer && console.timeEnd('共计用时：')
        })
      }

      if (cluster.isWorker) {
        monitor?.error && process.on('error', monitor.error)

        cluster.worker?.send({ type: 'getData' })

        // const close = () => cluster.worker?.kill()

        cluster.worker?.on('message', async message => {
          monitor?.letter && monitor.letter(cluster.worker, message)

          const { type, payload } = message

          if (type == 'supply') {
            try {
              await tasks.reduce(
                (p, c) => p.then(d => c(d, mode == 'manual' ? cluster.worker : undefined)),
                Promise.resolve(payload),
              )

              monitor?.wave && (await monitor.wave(cluster.worker, payload))
            } catch (error) {
              monitor?.error && monitor?.error(error, cluster.worker, message)
            }

            if (mode == 'single') {
              cluster.worker?.kill()
            }

            if (mode == 'infinite') {
              cluster.worker?.send({
                type: 'getData',
              })
            }
          }
        })
      }
    },
  }
}

export default fire
