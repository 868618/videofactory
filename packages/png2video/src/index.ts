// const lodash = require('lodash')
// const sizeof = require('image-size')
// const { FFScene, FFImage, FFCreator, FFText } = require('ffcreator')
import { FFScene, FFImage, FFCreator, FFText } from 'ffcreator'
import { type FFCreatorConf } from 'ffcreator'
import sizeof from 'image-size'
import lodash from 'lodash'

interface IOptions {
  outputDir: string
  type: 'pc' | 'mobile'
  time: number
  cover?: string
}

const png2video = (png: string, options: IOptions & FFCreatorConf) => {
  const { type, time } = options

  const sizes = {
    pc: {
      width: 1920,
      height: 1080,
    },
    mobile: {
      width: 1080,
      height: 1920,
    },
  }

  const size = sizes[type]

  // const creator = new FFCreator({
  //   // ...lodash.omit(options, ['type']),
  //   ...options,
  //   ...size,
  // })

  const creator = new FFCreator(Object.assign({}, options, size))

  const scene = new FFScene()

  const { width: rW, height: rH } = sizeof(png) as {
    width: number
    height: number
  }

  const tH = (size.width * rH) / rW

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
    time,
    delay: 1,
    ease: 'Linear.None',
  })

  scene.setDuration(time + 1)

  // const moreText = new FFText({
  //   text: `更多资料关注我`,
  //   color: '#fff',
  //   x: size.width / 2,
  //   y: size.height - 60,
  //   fontSize: 60,
  // })

  // moreText.setBackgroundColor('#000')
  // moreText.alignCenter()
  // moreText.setStyle({
  //   with: size.width,
  // })

  // moreText.addEffect('fadeInRight', 1, time - 5)

  scene.addChild(ffImage)
  // scene.addChild(moreText)
  creator.addChild(scene)

  return creator
}

export default png2video
