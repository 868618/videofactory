// import fs from 'fs-extra'
import path from 'path'
import * as glob from 'glob'
import { exec } from 'child_process'
import lodash from 'lodash'

// const mp3s = glob.sync(path.resolve(__dirname, '../assets/mp3s/01/*'))

type IGetMp3sInfo = (mp3Folder: string) => Promise<{ mp3Path: string; duration: number }[]>

const getMp3sInfo: IGetMp3sInfo = async mp3Folder => {
  const mp3s = glob.sync(path.join(mp3Folder, '/*'))

  const list = (await Promise.all(
    mp3s.map(
      mp3Path =>
        new Promise(resolve => {
          exec(`ffmpeg -i '${mp3Path}'`, (error, stdout, stderr) => {
            const [str] = (stderr.toString().match(/\d{2}:\d{2}:\d+/gi) as string[]) || []

            let duration = 0

            if (str) {
              const [hour, minute, second] = str.split(':').map(Number)
              //   const [str] = duration.match(/:\d+:/gi) as string[]

              //   time = Number(str.replace(/:/gi, ''))

              duration = hour * 3600 + minute * 60 + second
            }

            resolve({ mp3Path, duration })
          })
        }),
    ),
  )) as { mp3Path: string; duration: number }[]

  return list
}

type IParams = (string | number | IParams)[] // 允许嵌套数组

type ICreateRandomName = (nameSamples: IParams) => string

const createRandomName: ICreateRandomName = nameSamples =>
  nameSamples
    .map(n => {
      const isArray = Array.isArray(n)

      if (!isArray) {
        return n
      }

      const randomItem = n.length == 1 ? n[0] : n[lodash.random(n.length - 1)]

      return createRandomName([randomItem])
    })
    .join('，')

class SuperDir {
  basePath: string
  constructor(basePath: string) {
    this.basePath = basePath
  }

  static getFolderName(basePath: string) {
    return path.basename(basePath)
  }

  static findChilds(dir: string, key: string) {
    return glob.sync(path.join(dir, '*')).filter(p => (key ? p.includes(key) : 1))
  }

  findChilds(key: string) {
    return glob.sync(path.join(this.basePath, '*')).filter(p => (key ? p.includes(key) : 1))
  }

  static findDirs(dir: string, key: string) {
    return glob
      .sync(path.join(dir, '**/*'), {
        // onlyDirectories: true,
      })
      .filter(dir => (key ? path.basename(dir).includes(key) : 1))
  }

  findDirs(key: string) {
    return glob
      .sync(path.join(this.basePath, '**/*'), {
        // onlyDirectories: true,
      })
      .filter(dir => (key ? path.basename(dir).includes(key) : 1))
  }

  static findChildDirs(dir: string, key: string) {
    return glob
      .sync(path.join(dir, '*/'), {
        // onlyDirectories: true,
      })
      .filter(dir => (key ? path.basename(dir).includes(key) : 1))
  }

  findChildDirs(key: string) {
    return glob
      .sync(path.join(this.basePath, '*/'), {
        // onlyDirectories: true,
      })
      .filter(dir => (key ? path.basename(dir).includes(key) : 1))
  }

  static findFiles(dir: string, exts: unknown[]) {
    const formatExts = Array.isArray(exts) ? `+(${exts.join('|')})` : exts
    const globExts = `**/*.${exts ? formatExts : ''}`
    const globPath = path.join(dir, globExts)

    return glob.sync(globPath, { nodir: true })
  }

  findFiles(exts: unknown[]) {
    const formatExts = Array.isArray(exts) ? `+(${exts.join('|')})` : exts
    const globExts = `**/*.${exts ? formatExts : ''}`
    const globPath = path.join(this.basePath, globExts)

    return glob.sync(globPath, { nodir: true })
  }

  static findChildFiles(dir: string, exts: unknown[]) {
    const formatExts = Array.isArray(exts) ? `+(${exts.join('|')})` : exts
    const globExts = `*.${exts ? formatExts : '*'}`
    const globPath = path.join(dir, globExts)

    return glob.sync(globPath, { nodir: true })
  }

  findChildFiles(exts: unknown[]) {
    const formatExts = Array.isArray(exts) ? `+(${exts.join('|')})` : exts
    const globExts = `*.${exts ? formatExts : '*'}`
    const globPath = path.join(this.basePath, globExts)

    return glob.sync(globPath, { nodir: true })
  }
}

// const shuffle = lodash.shuffle

const { shuffle, sample } = lodash

const randomToString = (list: string[], semi = '，') => {
  return shuffle(list).join(semi)
}

const chooseOne = sample

export { getMp3sInfo, createRandomName, SuperDir, shuffle, chooseOne, randomToString }
