import path from 'path'
import os from 'os'
import * as glob from 'glob'
import fs from 'fs-extra'
import lodash from 'lodash'
import crypto from 'crypto'
import sizeof from 'image-size'
import randomcolor from 'randomcolor'
import pdf2images from '@fatpigs/pdf2images'
import { spawnSync } from 'child_process'
// import { ESLint } from 'eslint'
import prettier from 'prettier'

import fire from '@fatpigs/fire'
import { type PDFPage, PDFDocument } from 'pdf-lib'
import renderpdf from '@fatpigs/renderpdf'
import pdfcount from '@fatpigs/pdfcount'
import { FFScene, FFImage, FFCreator, FFCreatorCenter, FFText, FFAudio, FFVideo } from 'ffcreator'

import { transitions, effects } from '@/utils'
import { createRandomName, chooseOne, randomToString, shuffle } from '@/tools'

const ins = effects.filter(effect => effect.includes('In'))

type IData = {
  targetDir: string
  jsonPath: string
  folder: string
  fullPath: string
  mp4Path: string
  asstes: {
    lastBgImgPath: string
    fontPath: string
    coverBg: string
    audios: string[]
    materials: {
      boy: string
      girl: string
      filmHead: string
    }
  }
  pngList: string[]
  title: string
  counts: {
    count: number
    name: string
  }[]
}

const instance = fire({
  maxEngines: 6,

  timer: true,

  mode: 'single',

  async data() {
    const folders = ['01', '02', '03', '04', '05', '07']
    // const folders = ['02']
    const baseDataSource = '/Users/kenny/Desktop/store/data/'
    const allCourses = glob.sync(baseDataSource + '*/')

    const data = folders.map(folder => {
      /**
       * 目标文件夹里已经存在的目录
       */
      const existingDirectorys = glob
        .sync('/Volumes/SD/t_' + folder + '/*/')
        .map(dir => path.basename(dir))

      /**
       * 剔除现存目录之后的源目录
       */

      const dirs = allCourses.filter(dir => !existingDirectorys.some(d => path.basename(dir) == d))
      /**
       * @example
       * [
          {
            pdfList: [Array],
            dir: '/Users/kenny/Desktop/store/data/道路勘测设计',
            folder: '01'
          },
          {
            pdfList: [Array],
            dir: '/Users/kenny/Desktop/store/data/逻辑学导论',
            folder: '01'
          }
        ]
       */
      return lodash
        .shuffle(dirs)
        .slice(0, 5)
        .map(dir => ({
          pdfList: glob.sync(dir + '/*.pdf').filter(pdf => pdf.endsWith('.pdf')),
          dir,
          folder,
          targetDir: '/Users/kenny/Desktop/t_' + folder,
        }))
    })

    const maps = lodash.zip(...data).flat(Infinity)

    /**
     * @example
     * [
      * {
          pdfList: [
            '/Users/kenny/Desktop/store/data/机械工程控制基础/机械工程控制基础试题集锦.pdf',
            '/Users/kenny/Desktop/store/data/机械工程控制基础/机械工程控制基础知识点整合.pdf',
          ],
          dir: '/Users/kenny/Desktop/store/data/机械工程控制基础',
          folder: '05'
        },
        {
          pdfList: [
            '/Users/kenny/Desktop/store/data/语言治疗学/语言治疗学练习题及答案.pdf',
            '/Users/kenny/Desktop/store/data/语言治疗学/言语治疗学复习题.pdf',
          ],
          dir: '/Users/kenny/Desktop/store/data/语言治疗学',
          folder: '06'
        }
     * ]
     */
    return maps
  },

  tasks: [
    /**
     *
     * @description
     *
     * 生产图片和json描述文件
     */
    async data => {
      const { folder, pdfList, dir, targetDir } = data as {
        folder: string
        pdfList: string[]
        dir: string
        targetDir: string
      }

      const asstes = {
        lastBgImgPath: path.join(__dirname, `./assets/borders/${folder}/border.png`),
        fontPath: path.join(__dirname, `./assets/fonts/${folder}/ziti.ttf`),
        coverBg: path.join(__dirname, `./assets/covers/${folder}/p.png`),
        audios: glob.sync(path.join(__dirname, `./assets/mp3s/${folder}/*`)),
        materials: {
          boy: path.join(__dirname, `./assets/covers/${folder}/boy.png`),
          girl: path.join(__dirname, `./assets/covers/${folder}/girl.png`),
          filmHead: path.join(__dirname, `./assets/covers/${folder}/filmHead.mp4`),
        },
      }

      const pdfCounts = await Promise.all(
        pdfList.map(pdf => pdfcount(pdf).then(count => ({ count, pdf }))),
      )

      const filtered = pdfCounts.filter(({ count }) => count >= 10)

      /*
        如果pdfList里有大于10页的文档，就随机返回大于10页的文档
        如果没有，就随机返回一个
      */
      const shuffled = lodash.shuffle(filtered.length ? filtered : pdfCounts)

      const [{ pdf, count }] = shuffled

      const material = [
        /**
         * 绘制边框
         */

        {
          type: 'image',
          async render(pdfPage: PDFPage, pdfDoc: PDFDocument) {
            const { width, height } = pdfPage.getSize()
            const borderImagePath = `./src/assets/borders/${folder}/border.png`
            const borderImageBuffer = fs.readFileSync(borderImagePath)
            const image = await pdfDoc.embedPng(borderImageBuffer)

            return {
              x: 0,
              y: 0,
              width,
              height,
              image,
            }
          },
        },
        /*
          绘制尾页
        */
        {
          isLastPage: true,
          async render(pdfPage: PDFPage, pdfDoc: PDFDocument) {
            // const former = pdfPage.getSize()
            const former = { width: 1920, height: 1080 }
            const newPage = pdfDoc.addPage(Object.values(former) as [number, number])

            const lastBgImgBuffer = fs.readFileSync(asstes.lastBgImgPath)
            const lastBgImg = await pdfDoc.embedPng(lastBgImgBuffer)

            const { width: pWidth, height: pHeight } = newPage.getSize()

            // 绘制背景
            newPage.drawImage(lastBgImg, {
              x: 0,
              y: 0,
              width: pWidth,
              height: pHeight,
            })

            await pdfDoc.save()
          },
        },
      ]

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), crypto.randomUUID().toString()))

      fs.ensureDirSync(tmpDir)

      /*
        生成PDF文档
      */
      const newPdfPath = await renderpdf(pdf, {
        material,
        outputDir: tmpDir,
        lastPageToConvert: 19,
      })

      const classify = path.basename(dir)

      const imagesOutputDir = path.join(targetDir, classify)
      // console.log('AT-[ imagesOutputDir &&&&&********** ]', imagesOutputDir)

      fs.ensureDirSync(imagesOutputDir)

      const { list: pngList } = await pdf2images(newPdfPath, imagesOutputDir)
      // console.log('AT-[ list, pattern &&&&&********** ]', list)

      // const longpngPath = await pdf2longpng(newPdfPath as string, imagesOutputDir, 'longpng')

      fs.rmSync(tmpDir, { recursive: true })

      const counts = pdfCounts.map(({ count, pdf }) => ({ count, name: path.basename(pdf) }))

      const json = {
        title: path.basename(dir),
        counts,
        pdf,
        targetDir,
        folder,
        // count,
        dir,
        fullPath: imagesOutputDir,
        // asstes,
        pngList,
      }

      // const eslint = new ESLint()

      const jsonStr = JSON.stringify(json)

      const formattedJson = await prettier.format(jsonStr, {
        parser: 'json',
      })

      const jsonFilePath = path.join(imagesOutputDir, 'desc.json')

      // json文件
      fs.writeFileSync(jsonFilePath, formattedJson)

      return {
        // longpngPath,
        // jsonPath,
        title: path.basename(dir),
        folder,
        dir,
        count,
        imagesOutputDir,
        targetDir,
        asstes,
        pngList,
        counts,
        fullPath: imagesOutputDir,
      }
    },

    /**
     *@description t_01号机
     */
    async data => {
      const { targetDir, asstes, pngList, folder, title, counts, fullPath } = <IData>data

      if (folder != '01') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      // const bg = path.join(__dirname, '../assets/covers/01/p.png')
      // const bg = asstes.coverBg

      const coverScene = new FFScene()

      const coverBg = new FFImage({
        path: asstes.coverBg,
        x: 1920 / 2,
        y: 1080 / 2,
        width: 1920,
        height: 1080,
      })

      coverBg.addEffect(lodash.shuffle(ins).slice(0, 2), 1.5, 0)

      coverScene.addChild(coverBg)

      const titleFFText = new FFText({
        text: `《${title as string}》`,
        x: 30,
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

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 2.5)

      coverScene.addChild(titleFFText)

      const girlFFImage = new FFImage({
        path: asstes.materials.girl,
        x: size.width - 330,
        y: size.height - 260 / 2,
        width: 200,
        height: 275,
      })

      girlFFImage.addEffect(['bounceInUp'], 1.5, 0.8)
      coverScene.addChild(girlFFImage)

      const boyFFImage = new FFImage({
        path: asstes.materials.boy,
        x: size.width - 540,
        y: size.height - 337 / 2,
        width: 300,
        height: 337,
      })

      boyFFImage.addEffect(['bounceInUp'], 1.5, 0.5)
      coverScene.addChild(boyFFImage)

      const [transition] = lodash.shuffle(transitions)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 200 : 150,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
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

        if (counter == pngs.length) {
          scene.setDuration(animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      // const audios = asstes.audios

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          console.log('AT-[ complete &&&&&********** ]', e.output)

          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    /**
     * t_02号机
     */
    async data => {
      const { folder, asstes, title, pngList, counts, targetDir, fullPath } = <IData>data

      if (folder != '02') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      const filmHeader = new FFVideo({
        path: asstes.materials.filmHead,
        width: size.width,
        height: size.height,
        x: size.width / 2,
        y: size.height / 2,
      })

      // filmHeader.setLoop(true)

      const coverScene = new FFScene()

      coverScene.addChild(filmHeader)

      const [transition] = lodash.shuffle(transitions)

      const dominantColor = randomcolor({ hue: 'red', luminosity: 'dark' })
      const secondaryColor = randomcolor({ hue: dominantColor, luminosity: 'light' })

      const titleFFText = new FFText({
        text: `《${title}》`,
        x: (size.width - 150 * (title.length + 2)) / 2,
        y: 200,
        // color: dominantColor,
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: [dominantColor],
        stroke: secondaryColor,
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: secondaryColor,
      })

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 3)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleColor = randomcolor({ hue: 'random', luminosity: 'dark' })
          const subTitleColor = randomcolor({ hue: 'random', luminosity: 'light' })
          const subTitleShadowColor = randomcolor({ hue: subTitleColor, luminosity: 'dark' })

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 180 : 150,
            color: titleColor,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
              .filter(Boolean)
              .join('\r\n'),
            // color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: subTitleColor,
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: subTitleShadowColor,
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

        if (counter == pngs.length) {
          scene.setDuration(10 + animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    /**
     * t_03号机
     */
    async data => {
      const { folder, asstes, title, pngList, counts, targetDir, fullPath } = <IData>data

      if (folder != '03') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      const filmHeader = new FFVideo({
        path: asstes.materials.filmHead,
        width: size.width,
        height: size.height,
        x: size.width / 2,
        y: size.height / 2,
      })

      // filmHeader.setLoop(true)

      const coverScene = new FFScene()

      coverScene.addChild(filmHeader)

      const [transition] = lodash.shuffle(transitions)

      const dominantColor = randomcolor({ hue: 'random', luminosity: 'dark' })
      const secondaryColor = randomcolor({ hue: dominantColor, luminosity: 'light' })

      const titleFFText = new FFText({
        text: `《${title}》`,
        x: (size.width - 150 * (title.length + 2)) / 2,
        y: 200,
        // color: dominantColor,
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: [dominantColor],
        stroke: secondaryColor,
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: secondaryColor,
      })

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 3)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleColor = randomcolor({ hue: 'random', luminosity: 'dark' })
          const subTitleColor = randomcolor({ hue: 'random', luminosity: 'light' })
          const subTitleShadowColor = randomcolor({ hue: subTitleColor, luminosity: 'dark' })

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 180 : 150,
            color: titleColor,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
              .filter(Boolean)
              .join('\r\n'),
            // color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: subTitleColor,
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: subTitleShadowColor,
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

        if (counter == pngs.length) {
          scene.setDuration(10 + animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    /**
     * t_04号机
     */
    async data => {
      const { folder, asstes, title, pngList, counts, targetDir, fullPath } = <IData>data

      if (folder != '04') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      const filmHeader = new FFVideo({
        path: asstes.materials.filmHead,
        width: size.width,
        height: size.height,
        x: size.width / 2,
        y: size.height / 2,
      })

      // filmHeader.setLoop(true)

      const coverScene = new FFScene()

      coverScene.addChild(filmHeader)

      const [transition] = lodash.shuffle(transitions)

      const dominantColor = randomcolor({ hue: 'random', luminosity: 'dark' })
      const secondaryColor = randomcolor({ hue: dominantColor, luminosity: 'light' })

      const titleFFText = new FFText({
        text: `《${title}》`,
        x: (size.width - 150 * (title.length + 2)) / 2,
        y: 200,
        // color: dominantColor,
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: [dominantColor],
        stroke: secondaryColor,
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: secondaryColor,
      })

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 6)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 8,
      })

      coverScene.setDuration(10)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleColor = randomcolor({ hue: 'random', luminosity: 'dark' })
          const subTitleColor = randomcolor({ hue: 'random', luminosity: 'light' })
          const subTitleShadowColor = randomcolor({ hue: subTitleColor, luminosity: 'dark' })

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 180 : 150,
            color: titleColor,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
              .filter(Boolean)
              .join('\r\n'),
            // color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: subTitleColor,
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: subTitleShadowColor,
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

        if (counter == pngs.length) {
          scene.setDuration(10 + animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    /**
     * t_05号机
     */
    async data => {
      const { folder, asstes, title, pngList, counts, targetDir, fullPath } = <IData>data

      if (folder != '05') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      const filmHeader = new FFVideo({
        path: asstes.materials.filmHead,
        width: size.width,
        height: size.height,
        x: size.width / 2,
        y: size.height / 2,
      })

      filmHeader.setLoop(true)

      const coverScene = new FFScene()

      coverScene.addChild(filmHeader)

      const [transition] = lodash.shuffle(transitions)

      const dominantColor = randomcolor({ hue: 'random', luminosity: 'light' })
      const secondaryColor = randomcolor({ hue: dominantColor, luminosity: 'dark' })

      const titleFFText = new FFText({
        text: `《${title}》`,
        x: (size.width - 150 * (title.length + 2)) / 2,
        y: size.height / 2,
        // color: dominantColor,
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: [dominantColor],
        stroke: secondaryColor,
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: secondaryColor,
      })

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 2)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleColor = randomcolor({ hue: 'random', luminosity: 'dark' })
          const subTitleColor = randomcolor({ hue: 'random', luminosity: 'light' })
          const subTitleShadowColor = randomcolor({ hue: subTitleColor, luminosity: 'dark' })

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 180 : 150,
            color: titleColor,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
              .filter(Boolean)
              .join('\r\n'),
            // color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: subTitleColor,
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: subTitleShadowColor,
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

        if (counter == pngs.length) {
          scene.setDuration(10 + animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    /**
     * t_07号机
     */
    async data => {
      const { folder, asstes, title, pngList, counts, targetDir, fullPath } = <IData>data

      if (folder != '07') {
        return data
      }

      const size = { width: 1920, height: 1080 }

      const creator = new FFCreator({
        cacheDir: path.resolve(__dirname, '.cacheDir'), // 缓存目录
        outputDir: path.resolve(__dirname, '.outputDir'), // 输出目录
        // output: 'transitions', // 输出文件名(FFCreatorCenter中可以不设)
        width: size.width, // 影片宽
        height: size.height, // 影片高
        highWaterMark: '3mb',
        audioLoop: true, // 音乐循环
        fps: 30, // fps
        debug: false, // 开启测试模式
        defaultOutputOptions: null, // ffmpeg输出选项配置
        parallel: 8,
      })

      const filmHeader = new FFVideo({
        path: asstes.materials.filmHead,
        width: size.width,
        height: size.height,
        x: size.width / 2,
        y: size.height / 2,
      })

      filmHeader.setLoop(true)

      const coverScene = new FFScene()

      coverScene.addChild(filmHeader)

      const [transition] = lodash.shuffle(transitions)

      const dominantColor = randomcolor({ hue: 'random', luminosity: 'light' })
      const secondaryColor = randomcolor({ hue: dominantColor, luminosity: 'dark' })

      const titleFFText = new FFText({
        text: `《${title}》`,
        x: (size.width - 150 * (title.length + 2)) / 2,
        y: size.height / 2 - 75,
        // color: dominantColor,
        fontSize: 150,
        style: {
          padding: [4, 20, 6, 20],
        },
      })

      titleFFText.setStyle({
        fill: [dominantColor],
        stroke: secondaryColor,
        strokeThickness: 8,
        dropShadow: true,
        dropShadowColor: secondaryColor,
      })

      /**
       * 给标题增加随机入场动画
       */
      titleFFText.addEffect(lodash.shuffle(ins).slice(0, 3), 1.5, 2)

      coverScene.addChild(titleFFText)

      coverScene.setTransition(transition, 1.5, {
        delay: 4,
      })

      coverScene.setDuration(8)

      creator.addChild(coverScene)

      const pngs = pngList.sort()

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

        scene.addChild(ffImage)

        scene.setTransition('Directional', transitionDuration, {
          ease: 'linear',
        })

        if (counter == pngs.length) {
          transitionDuration = 1

          const titleColor = randomcolor({ hue: 'random', luminosity: 'dark' })
          const subTitleColor = randomcolor({ hue: 'random', luminosity: 'light' })
          const subTitleShadowColor = randomcolor({ hue: subTitleColor, luminosity: 'dark' })

          const titleText = new FFText({
            text: `《${title}》`,
            fontSize: title.length <= 9 ? 180 : 150,
            color: titleColor,
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
            text: counts
              .map((i, idx) => `${idx + 1}、${i.name.trim()}`)
              .filter(Boolean)
              .join('\r\n'),
            // color: '#ffffff',
            x: 200,
            y: 400,
          })

          listNamesText.setStyle({
            fontFamily: 'Arial',
            fontSize: 50,
            fontStyle: 'italic',
            fontWeight: 'bold',
            color: subTitleColor,
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: subTitleShadowColor,
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

        if (counter == pngs.length) {
          scene.setDuration(10 + animateDelay + transitionDuration)
        } else {
          scene.setDuration(20 + animateDelay + transitionDuration)
        }

        creator.addChild(scene)

        animateDelay = transitionDuration
      }

      const [audioPath] = lodash.shuffle(asstes.audios)

      creator.addAudio(
        new FFAudio({
          path: audioPath,
          volume: 2,
          fadeIn: 2,
          fadeOut: 4,
          loop: true,
        }),
      )

      const mp4Path = await new Promise((resolve, reject) => {
        creator.on('start', () => {
          console.time('共用时：')
        })

        creator.on('progress', e => {
          console.log('AT-[ progress ]', fullPath, (e.percent * 100) >> 0)
        })

        creator.on('complete', e => {
          const mp4Path = path.join(targetDir, title, title + '.mp4')

          fs.moveSync(e.output, mp4Path)
          console.timeEnd('共用时：')
          resolve(mp4Path)
        })

        creator.on('error', e => {
          console.log(`FFCreator error: ${e.error}`)
          reject(e)
        })

        FFCreatorCenter.addTask(() => creator)

        creator.start()
      })

      return { ...(<IData>data), mp4Path }
    },

    // 生成cover图片
    async data => {
      const { targetDir, title, folder, mp4Path } = <IData>data

      // const mp4Path = path.join(targetDir, title, title + '.mp4')
      const coverPngPath = path.join(targetDir, title, 'cover.png')

      // ffmpeg -i input.mp4 -ss 00:00:10 -vframes 1 output.jpg
      const timer = folder == '04' ? '00:00:08' : '00:00:05'

      spawnSync('ffmpeg', ['-i', mp4Path, '-ss', timer, '-vframes', '1', coverPngPath])

      return { ...(<IData>data), coverPngPath }
    },

    /**
     *
     * @description 生成B站相关JSON
     */
    async data => {
      // const { folder, title } = <IData>data

      const { targetDir, title, folder, coverPngPath, mp4Path, counts, fullPath } = <
        IData & { coverPngPath: string; mp4Path: string }
      >data

      let name = ''
      let head = ''
      let detail = ''
      let guide = ''
      let topic = ''
      let article = ''

      if (folder == '01') {
        head = randomToString(
          [
            chooseOne(['高分秘籍', '复习必备', '考试攻略', '复习利器', '复习攻略', '复习技巧']),
            `《${title}》`,
          ],
          '',
        )
        detail = randomToString(
          shuffle([
            '复习资料',
            '重点笔记',
            '真题题库',
            '名词解释',
            '知识汇总',
            '重点总结',
            '提分要点',
            '实战经验',
          ]).slice(0, 5),
          '、',
        )

        guide = randomToString(
          shuffle([
            '掌握高分技巧',
            '考试轻松应对',
            `助你轻松上${lodash.random(90, 99)}！`,
            '逆袭考试！',
            '题库资料大公开',
            '告别挂科！',
            '突破考试难关！',
            '轻松应对考试',
            '高分不是神话！',
            '告别挂科噩梦！',
            '考试就像抄答案',
            '考研期末都能用',
          ]).slice(0, 5),
        )

        topic = '专业课怎么背'

        article = `
      你好同学：
      突然心血来潮想写几句话给你，同时也是写给我自己。
      复习，不仅仅是个脑力活，还是个体力活。 学习的道路如同攀登高峰，困难险阻比比皆是，眼前这座知识的离峰，虽然险峻，
      却正等着咱们去一一征服。 在这个过程中，我们会遇到很多困难，但正是这些挑战，让我们的青春变得更加
      彩！ 别怕压力，记住，汗水和努力都不会被辜负，每一次的考试都是人生的一次磨练，
      现在的拼搏都是为了成为更好的自己。 别觉得辛苦没意义，每一次的刷题、熬夜，都是在为将来的自己铺路，确实，考试
      这玩意儿有时候很让人抓狂，可千万别让它影响了咱们对梦想的追逐！ 不管将来成绩怎样，都不能影响我们对自己的认可，我觉得过程远本身比结果重要 得多。未来或许我们面临的险阻要比眼下的考试要难的多，但，不无论怎样，一切 都是要靠实力说话的，坚持梦想，堅持努力，我们的努力迟早都会有所回报，功不
      麽捐。 最后，别忘了偶尔放松一下，善待自己。咱们不是机器人，也需要休总。别把分数
      当成生活的全部 在这个过程中我们是心有灵犀的朋友，也是相互的支持者，一起努力，一起奔跑，
      一起创造咱们自己的青春传奇
      `
      }

      if (folder == '02') {
        head = randomToString(['最新', '最全'], '') + `的《${title}》复习资料`

        detail = randomToString(['期末', '考研', '期中', '复习'], '、') + '都适用'

        guide = randomToString([`轻松拿下${lodash.random(90, 98)}+`, `真的没那么难!`])

        topic = '期末复习'
      }

      if (folder == '03') {
        head = createRandomName([
          `专业课《${title}》`,
          randomToString(['真题题库', '重点总结', '重点笔记', '试题练习'], '、'),
        ])

        detail = randomToString([
          randomToString(['期末', '考研', '期中', '复习'], '') + '都适用',
          randomToString(['核心概念', '关键知识点', '典型题目', '考点梳理'], '、'),
        ])

        guide = randomToString(
          shuffle(
            [
              `考试零压力！`,
              '考试救急！',
              '考前必备！',
              '隐藏考点！',
              '轻松过考无压力',
              '重点知识梳理',
              '轻松应对！',
              '为你的考试保驾护航！',
              '2023年专业课考研复习资料大汇总！',
              '让你一次就过！',
              '让你轻松上阵！',
              '突破考试瓶颈！',
              '让你快速提升成绩！',
              '让你考试无忧！',
              '让你成为考试达人！',
              '让你变身学霸！',
            ].slice(0, 2),
          ),
        )

        topic = '专业课资料'
      }

      if (folder == '04') {
        head = randomToString([
          randomToString(['最准确', '最全'], '') + `的《${title}》复习资料`,
          randomToString(['知识点', '重点内容', '真题题库', '名词解释'], '+'),
        ])

        detail = randomToString(
          shuffle([
            '秒杀考试',
            '权威发布',
            '必备宝典',
            '完美攻略',
            '考试必备',
            '高效备考',
            '独家秘籍',
            '独家解析',
            '保姆级教程',
            '零基础逆袭',
            '考试无忧',
            '一网打尽',
            '无压力备考',
            '实战经验',
          ]).slice(0, 2),
        )

        guide = randomToString(
          shuffle([
            '实用的复习资料',
            '轻松备考！',
            '高效学习秘籍！',
            '复习必备资料大揭秘！',
            '考试备考大揭秘！',
            '高效学习方法分享！',
            '大学生福利！',
            '考试复习资料免费送！',
            '考试资料大放送！',
            '高效备考攻略分享！',
            '轻松备考秘籍！',
            '考试复习资料推荐！',
            '不可错过！',
            '考试资料分享',
            '助你高分通过！',
            '考试必备！',
            '复习资料推荐',
          ]).slice(0, 2),
        )

        topic = '考研复习'
      }

      if (folder == '05') {
        head = `《${title}》`
        detail = randomToString(['知识点总结', '重点笔记', '真题题库', '名解'], '+')
        guide = randomToString(
          shuffle([
            '制胜考试的秘诀',
            '高效备考方法大揭秘！',
            '掌握复习窍门',
            '考试全攻略！',
            '备考经验分享！',
            '助你轻松备战考试！',
            '拯救期末考试焦虑',
            '备考攻略',
            '考试不再是难题！',
            '成为学霸的秘诀',
            '高效复习',
            '考试前的黄金时期利用！',
            '精华资源分享！',
          ]).slice(0, 3),
        )
        topic = '大学期末考试'
      }

      if (folder == '07') {
        head = `《${title}》`
        detail = randomToString(
          ['重点内容', '思维导图', '复习提纲', '题库', '笔记', 'PDF资料'],
          '+',
        )
        guide = randomToString([
          `考试玩爆${lodash.random(90, 98)}+`,
          '助你稳拿好成绩！',
          '全新资料大揭秘！',
          '考试复习攻略来袭！',
          '一站式学习！',
          '考试复习资料汇总分享！',
          '突破考试困境',
          '有效的备考技巧大公开！',
          '赢在考试',
          '备考技巧与方法分享！',
          '高分攻略！',
          '考试大冲刺',
          '备考最后阶段的窍门！',
          '高效备考路线图！',
        ])
        topic = '考研资料在哪找'
      }

      const tags = shuffle([
        title,
        `${title}复习资料`,
        `${title}考研复习`,
        `${title}期末复习`,
        `${title}期中复习`,
        `${title}题库`,
        `${title}笔记`,
        `${title}大纲`,
        `${title}真题`,

        chooseOne([
          '期末复习资料',
          '期末复习',
          '期中复习',
          '考研复习',
          '考研复习资料',
          '专业课复习',
          '专业课复习资料',
          '大学期末复习',
          '大学期末考',
          '期中考',
          '大学期中考',
          '专业课资料',
          '大学专业课',
          '大学专业课复习资料',
          '大学专业课复习',
          '期末专业课复习',
          '期中专业课复习',
        ]),
      ])

      name = randomToString([head, detail, guide]).replace(/(！，)|(!，)/g, '！')

      const desc =
        article +
        counts.reduce((pre, cur, index) => {
          const { name, count } = cur
          return `${pre}\r\n ${index + 1}: ${name}(${count}页)`
        }, '资料详情')

      const jsonStr = JSON.stringify({ name, coverPngPath, tags, topic, mp4Path, desc, fullPath })

      const formattedJson = await prettier.format(jsonStr, {
        parser: 'json',
      })

      const jsonFilePath = path.join(targetDir, title, 'b.json')

      fs.writeFileSync(jsonFilePath, formattedJson)

      return data
    },

    async data => {
      const { folder } = <IData & { coverPngPath: string }>data
      console.log('AT-[ folder &&&&&********** ]', folder)
      process.exit(0)
    },
  ],

  monitor: {
    // wave(worker) {
    //   console.log('AT-[ worker.id ]', worker?.id)
    // },

    error(err) {
      console.error('AT-[ err &&&&&********** ]', err)
    },
  },
})

instance.go()
