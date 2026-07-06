/**
 * 健多食广Fit — 微信云托管 Express 后端
 *
 * 功能:
 *   1. 微信 Open ID 获取
 *   2. 数据库 CRUD（饮食记录、训练日志、积分、体重）
 *   3. 健康检查 & 计数器演示
 *
 * 部署: 微信云托管容器化部署
 * 调用: 小程序端使用 wx.cloud.callContainer
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { init: initDB, Counter, DietRecord, TrainingLog, UserPoints, WeightLog } = require('./db');

const logger = morgan('tiny');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(logger);

// ================================================================
//  通用 API 路由
// ================================================================

// 首页
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 计数器（模板演示，可移除）
app.post('/api/count', async (req, res) => {
  const { action } = req.body;
  if (action === 'inc') {
    await Counter.create();
  } else if (action === 'clear') {
    await Counter.destroy({ truncate: true });
  }
  res.send({ code: 0, data: await Counter.count() });
});

app.get('/api/count', async (req, res) => {
  res.send({ code: 0, data: await Counter.count() });
});

// 小程序调用 — 获取微信 Open ID
app.get('/api/wx_openid', async (req, res) => {
  if (req.headers['x-wx-source']) {
    res.send(req.headers['x-wx-openid']);
  } else {
    res.send('non-wx-request');
  }
});

// ================================================================
//  数据 CRUD 路由（饮食记录、训练日志、积分、体重）
// ================================================================

// --- 饮食记录 ---
// POST /api/diet 保存当日饮食记录
app.post('/api/diet', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { date, records } = req.body;
    if (!date) return res.status(400).json({ code: -1, msg: '缺少 date 参数' });

    const [record, created] = await DietRecord.findOrCreate({
      where: { openid, date },
      defaults: { openid, date, records: JSON.stringify(records || {}) }
    });
    if (!created) {
      record.records = JSON.stringify(records || {});
      await record.save();
    }
    res.json({ code: 0, data: { date, created } });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// GET /api/diet?date=YYYYMMDD 获取当日饮食记录
app.get('/api/diet', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { date } = req.query;
    if (!date) return res.status(400).json({ code: -1, msg: '缺少 date 参数' });

    const record = await DietRecord.findOne({ where: { openid, date } });
    res.json({ code: 0, data: record ? JSON.parse(record.records) : {} });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// --- 训练日志 ---
// POST /api/training 保存当日训练日志
app.post('/api/training', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { date, log } = req.body;
    if (!date) return res.status(400).json({ code: -1, msg: '缺少 date 参数' });

    const [record, created] = await TrainingLog.findOrCreate({
      where: { openid, date },
      defaults: { openid, date, log: JSON.stringify(log || {}) }
    });
    if (!created) {
      record.log = JSON.stringify(log || {});
      await record.save();
    }
    res.json({ code: 0, data: { date, created } });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// GET /api/training?date=YYYYMMDD 获取当日训练日志
app.get('/api/training', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { date } = req.query;
    if (!date) return res.status(400).json({ code: -1, msg: '缺少 date 参数' });

    const record = await TrainingLog.findOne({ where: { openid, date } });
    res.json({ code: 0, data: record ? JSON.parse(record.log) : {} });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// --- 积分 ---
// GET /api/points 获取用户积分
app.get('/api/points', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const record = await UserPoints.findOne({ where: { openid } });
    res.json({ code: 0, data: record ? record.points : 0 });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// POST /api/points 增减积分 { delta: +1 或 -5 }
app.post('/api/points', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { delta } = req.body;
    if (!delta) return res.status(400).json({ code: -1, msg: '缺少 delta 参数' });

    const [record, created] = await UserPoints.findOrCreate({
      where: { openid },
      defaults: { openid, points: delta }
    });
    if (!created) {
      record.points = Math.max(0, record.points + delta);
      await record.save();
    }
    res.json({ code: 0, data: record.points });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// --- 体重记录 ---
// POST /api/weight 保存体重 { date, weight }
app.post('/api/weight', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const { date, weight } = req.body;
    if (!date || !weight) return res.status(400).json({ code: -1, msg: '缺少 date 或 weight' });

    const [record, created] = await WeightLog.findOrCreate({
      where: { openid, date },
      defaults: { openid, date, weight }
    });
    if (!created) {
      record.weight = weight;
      await record.save();
    }
    res.json({ code: 0, data: { date, weight, created } });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// GET /api/weight?days=7 获取最近 N 天体重记录
app.get('/api/weight', async (req, res) => {
  try {
    const openid = req.headers['x-wx-openid'] || 'dev_user';
    const days = parseInt(req.query.days) || 7;

    const records = await WeightLog.findAll({
      where: { openid },
      order: [['date', 'DESC']],
      limit: days
    });
    res.json({ code: 0, data: records.map(r => ({ date: r.date, weight: r.weight })) });
  } catch (e) {
    res.status(500).json({ code: -1, msg: e.message });
  }
});

// ================================================================
//  启动服务器（云托管 bootstrap 模式）
// ================================================================
const port = process.env.PORT || 80;

async function bootstrap() {
  // 初始化数据库（如果 MySQL 环境变量存在则连接，否则跳过）
  const hasMySQL = process.env.MYSQL_ADDRESS && process.env.MYSQL_USERNAME && process.env.MYSQL_PASSWORD;
  if (hasMySQL) {
    await initDB();
    console.log('[DB] MySQL 已连接并初始化');
  } else {
    console.log('[DB] 未配置 MySQL 环境变量，数据库功能暂不可用');
  }

  app.listen(port, () => {
    console.log(`\n✅ 健多食广Fit 后端已启动 (端口 ${port})`);
  });
}

bootstrap();
