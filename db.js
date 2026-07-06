/**
 * 食事半功倍 — Sequelize 数据库模型定义
 *
 * 环境变量要求（云托管自动注入）:
 *   MYSQL_ADDRESS  — MySQL 主机:端口（如 "10.0.0.1:3306"）
 *   MYSQL_USERNAME — MySQL 用户名
 *   MYSQL_PASSWORD — MySQL 密码
 *
 * 数据库名: eathealthy（云托管 MySQL 实例中创建）
 */

const { Sequelize, DataTypes } = require('sequelize');

const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = '' } = process.env;
const [host, port] = MYSQL_ADDRESS.split(':');

const sequelize = new Sequelize('eathealthy', MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port: parseInt(port) || 3306,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',  // 支持 emoji + 中文字符
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  logging: false,          // 生产环境关闭 SQL 日志
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// ================================================================
//  模型定义
// ================================================================

// 计数器（模板演示，可移除）
const Counter = sequelize.define('Counter', {
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

// 饮食记录 — 对应小程序 diet_record_YYYYMMDD
const DietRecord = sequelize.define('DietRecord', {
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING(8),   // YYYYMMDD
    allowNull: false,
  },
  records: {
    type: DataTypes.TEXT,         // JSON: { breakfast, lunch, dinner, snack }
    allowNull: false,
    defaultValue: '{}',
  },
}, {
  indexes: [
    { unique: true, fields: ['openid', 'date'] },
  ],
});

// 训练日志 — 对应小程序 training_log_YYYYMMDD
const TrainingLog = sequelize.define('TrainingLog', {
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  log: {
    type: DataTypes.TEXT,         // JSON: { exercises, completedCount, allDone }
    allowNull: false,
    defaultValue: '{}',
  },
}, {
  indexes: [
    { unique: true, fields: ['openid', 'date'] },
  ],
});

// 用户积分 — 对应小程序 user_points
const UserPoints = sequelize.define('UserPoints', {
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

// 体重记录 — 对应小程序 weight_log_YYYYMMDD
const WeightLog = sequelize.define('WeightLog', {
  openid: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING(8),
    allowNull: false,
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  indexes: [
    { unique: true, fields: ['openid', 'date'] },
  ],
});

// ================================================================
//  初始化
// ================================================================

async function init() {
  await sequelize.sync({ alter: true });
  console.log('[DB] 所有模型已同步');
}

module.exports = {
  init,
  sequelize,
  Counter,
  DietRecord,
  TrainingLog,
  UserPoints,
  WeightLog,
};
