import path from 'path'
import fs from 'fs-extra'
import lodash from 'lodash'
import sizeof from 'image-size'
import * as glob from 'glob'
import fire from '@fatpigs/fire'

import { transitions, effects } from '@/utils'

import { FFScene, FFImage, FFCreator, FFCreatorCenter, FFText, FFAudio } from 'ffcreator'

// const courseNames = glob.sync('/Users/kenny/Desktop/t_01/*/')

const ins = effects.filter(effect => effect.includes('In'))

const instance = fire({
  maxEngines: 7,

  timer: true,

  mode: 'single',

  async data() {
    const existing = glob
      .sync(path.join(__dirname, 'outputDir', '*'))
      .map(i => path.basename(i, '.mp4'))

    const courseNames = glob
      .sync('/Users/kenny/Desktop/t_01/*/')
      .filter(courseName => !existing.some(i => i.endsWith(courseName)))

    return courseNames
  },

  tasks: [
    async data => {
      const courseName = data as string

      const desc = JSON.parse(
        fs.readFileSync(path.join(courseName as string, 'desc.json'), 'utf8'),
      ) as {
        title: string
        counts: { count: number; name: string }[]
      }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, 'cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, 'outputDir'), // 输出目录
        output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: 1920, // 影片宽
        height: 1080, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
      })

      const bg = path.join(__dirname, '../assets/covers/01/p.png')

      const size = { width: 1920, height: 1080 }

      const coverScene = new FFScene()

      const coverBg = new FFImage({
        path: bg,
        x: 1920 / 2,
        y: 1080 / 2,
        width: 1920,
        height: 1080,
      })

      coverBg.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 0)

      coverScene.addChild(coverBg)

      const [transition] = lodash.shuffle(transitions)

      const titleFFText = new FFText({
        text: `《${desc.title}》`,
        x: 0,
        y: 200,
        color: '#000000',
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: ['#ffffff'],
        stroke: '#000000',
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: '#000000',
      })

      // const ins = lodash.shuffle(effects.filter(effect => effect.includes('In')))

      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 3)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      // const pngs = glob.sync('/Users/kenny/Desktop/t_01/食品酶学/img-*.png').sort()
      const pngs = glob.sync(path.join(courseName, 'img-*.png')).sort()
      // .concat(path.join(__dirname, '../assets/images/01/bg_pc.jpg'))

      let animateDelay = 1

      let transitionDuration = 17

      let counter = 0

      // 依次生成滚动视频
      for (const png of pngs) {
        counter++

        const scene = new FFScene()

        const { width: rW, height: rH } = sizeof(fs.readFileSync(png)) as {
          width: number
          height: number
        }

        const tH = (size.width * rH) / rW

        // add image
        const ffImage = new FFImage({
          path: png,
          x: 0,
          y: 0,
          resetXY: true,
          width: size.width,
          height: tH,
        })

        ffImage.addAnimate({
          from: {
            y: 0,
          },

          to: {
            y: -tH + size.height,
          },

          time: 20,

          ease: 'Linear.None',

          delay: animateDelay,

          // duration: 1,
        })

        // delay = 17

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleText = new FFText({
            text: `《${desc.title}》`,
            fontSize: desc.title.length <= 9 ? 200 : 150,
            color: '#000000',
            x: size.width / 2,
            y: 200,
          })

          titleText.alignCenter()

          titleText.setStyle({
            padding: [4, 20, 6, 20],
            dropShadowColor: '#000000',
          })

          titleText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 10)

          const listNamesText = new FFText({
            text: desc.counts
              .map(i => i.name.trim())
              .filter(Boolean)
              .join('\r\n'),
            color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: '#fff',
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
            wordWrap: false,
            lineHeight: 75,
          })

          listNamesText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 12)

          scene.addChild(titleText)

          scene.addChild(listNamesText)
        }

        scene.setDuration(20 + animateDelay + transitionDuration)

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const audios = glob.sync(path.join(__dirname, '../assets/mp3s/01/*'))

      const [audioPath] = lodash.shuffle(audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      await new Promise(resolve => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', desc.title, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          console.log('AT-[ complete &&&&&********** ]', e.output)

          const outputDirTmp = path.resolve(__dirname, 'outputDirTmp')

          fs.ensureDirSync(outputDirTmp)

          const mp4Path = path.resolve(outputDirTmp, path.basename(courseName) + '.mp4')

          fs.renameSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
          // process.exit(0)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })
    },
  ],
})

instance.go()

// const main = async () => {
//   for (const courseName of courseNames) {
//     const desc = JSON.parse(fs.readFileSync(path.join(courseName, 'desc.json'), 'utf8')) as {
//       title: string
//       counts: { count: number; name: string }[]
//     }

//     const creator = new FFCreator({
//       cacheDir: path.resolve(__dirname, 'cacheDir'), // 缓存目录
//       outputDir: path.resolve(__dirname, 'outputDir'), // 输出目录
//       output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
//       width: 1920, // 影片宽
//       height: 1080, // 影片高
//       highWaterMark: '3mb',
//       //   cover: 'a.jpg', // 设置封面
//       audioLoop: true, // 音乐循环
//       fps: 30, // fps
//       // threads: 4, // 多线程(伪造)并行渲染
//       debug: false, // 开启测试模式
//       defaultOutputOptions: null, // ffmpeg输出选项配置
//     })

//     const bg = path.join(__dirname, '../assets/covers/01/p.png')

//     const size = { width: 1920, height: 1080 }

//     const coverScene = new FFScene()

//     const coverBg = new FFImage({
//       path: bg,
//       x: 1920 / 2,
//       y: 1080 / 2,
//       width: 1920,
//       height: 1080,
//     })

//     coverBg.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 0)

//     coverScene.addChild(coverBg)

//     const [transition] = lodash.shuffle(transitions)

//     const titleFFText = new FFText({
//       text: `《${desc.title}》`,
//       x: 0,
//       y: 200,
//       color: '#000000',
//       fontSize: 150,
//       style: {
//         padding: [4, 20, 6, 20],
//       },
//     })

//     titleFFText.setStyle({
//       fill: ['#ffffff'],
//       stroke: '#000000',
//       strokeThickness: 8,
//       dropShadow: true,
//       dropShadowColor: '#000000',
//     })

//     // const ins = lodash.shuffle(effects.filter(effect => effect.includes('In')))

//     titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 3)

//     coverScene.addChild(titleFFText)

//     coverScene.setTransition(transition, 1.5, {
//       delay: 4,
//     })

//     coverScene.setDuration(8)

//     creator.addChild(coverScene)

//     // const pngs = glob.sync('/Users/kenny/Desktop/t_01/食品酶学/img-*.png').sort()
//     const pngs = glob.sync(path.join(courseName, 'img-*.png')).sort()
//     // .concat(path.join(__dirname, '../assets/images/01/bg_pc.jpg'))

//     let animateDelay = 1

//     let transitionDuration = 17

//     let counter = 0

//     for (const png of pngs) {
//       counter++

//       const scene = new FFScene()

//       const { width: rW, height: rH } = sizeof(fs.readFileSync(png)) as {
//         width: number
//         height: number
//       }

//       const tH = (size.width * rH) / rW

//       // add image
//       const ffImage = new FFImage({
//         path: png,
//         x: 0,
//         y: 0,
//         resetXY: true,
//         width: size.width,
//         height: tH,
//       })

//       ffImage.addAnimate({
//         from: {
//           y: 0,
//         },

//         to: {
//           y: -tH + size.height,
//         },

//         time: 20,

//         ease: 'Linear.None',

//         delay: animateDelay,

//         // duration: 1,
//       })

//       // delay = 17

//       scene.addChild(ffImage)

//       scene.setTransition('Directional', transitionDuration, {
//         ease: 'linear',
//       })

//       if (counter == pngs.length) {
//         transitionDuration = 1

//         const titleText = new FFText({
//           text: `《${desc.title}》`,
//           fontSize: desc.title.length <= 9 ? 200 : 150,
//           color: '#000000',
//           x: size.width / 2,
//           y: 200,
//         })

//         titleText.alignCenter()

//         titleText.setStyle({
//           padding: [4, 20, 6, 20],
//           dropShadowColor: '#000000',
//         })

//         titleText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 10)

//         const listNamesText = new FFText({
//           text: desc.counts
//             .map(i => i.name.trim())
//             .filter(Boolean)
//             .join('\r\n'),
//           color: '#ffffff',
//           x: 200,
//           y: 400,
//         })

//         listNamesText.setStyle({
//           fontFamily: 'Arial',
//           fontSize: 50,
//           fontStyle: 'italic',
//           fontWeight: 'bold',
//           color: '#fff',
//           strokeThickness: 8,
//           dropShadow: true,
//           dropShadowColor: '#000000',
//           dropShadowBlur: 4,
//           dropShadowAngle: Math.PI / 6,
//           dropShadowDistance: 6,
//           wordWrap: false,
//           lineHeight: 75,
//         })

//         listNamesText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 12)

//         scene.addChild(titleText)

//         scene.addChild(listNamesText)
//       }

//       scene.setDuration(20 + animateDelay + transitionDuration)

//       creator.addChild(scene)

//       animateDelay = transitionDuration
//     }

//     const audios = glob.sync(path.join(__dirname, '../assets/mp3s/01/*'))

//     const [audioPath] = lodash.shuffle(audios)

//     creator.addAudio(
//       new FFAudio({
//         path: audioPath,
//         volume: 2,
//         fadeIn: 2,
//         fadeOut: 4,
//         loop: true,
//       }),
//     )

//     await new Promise((resolve, reject) => {
//       creator.on('start', () => {
//         console.time('共用时：')
//       })

//       creator.on('progress', e => {
//         console.log('AT-[ progress ]', desc.title, (e.percent * 100) >> 0)
//       })

//       creator.on('complete', e => {
//         console.log('AT-[ complete &&&&&********** ]', e.output)

//         const mp4Path = path.resolve(__dirname, 'outputDir', path.basename(courseName) + '.mp4')

//         fs.renameSync(e.output, mp4Path)
//         console.timeEnd('共用时：')
//         resolve(mp4Path)
//         // process.exit(0)
//       })

//       creator.on('error', e => {
//         console.log(`FFCreator error: ${e.error}`)
//       })

//       FFCreatorCenter.addTask(() => creator)

//       creator.start()
//     })
//   }
// }

// main()
