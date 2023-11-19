// import * as glob from 'glob'
// import _ from 'lodash'
// import fs from 'fs-extra'
import { createRandomName, randomToString, shuffle } from '@/tools'
const head = `《title》`
const detail = randomToString(['知识点总结', '重点笔记', '真题题库', '名解'], '+')
const guide = randomToString(
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
    '突破考试困境',
    '有效的备考技巧大公开！',
    '赢在考试',
    '备考技巧与方法分享！',
    '高分攻略！',
    '考试大冲刺',
    '备考最后阶段的窍门！',
    '高效备考路线图！',
  ]).slice(0, 3),
)

const name = createRandomName([head + detail, guide]).replace(/！，/g, '！')
console.log('AT-[ name &&&&&********** ]', name)
console.log('AT-[ name &&&&&********** ]', name.length)
