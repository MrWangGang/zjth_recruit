const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 确保使用正确的云开发环境
});

const db = cloud.database();
const $ = db.command.aggregate;

/**
 * 云函数：getJobListGrouped
 * 功能：按职位类型分组，并截取每个组的前 3 条数据。
 * ⭐ 关键：只筛选 status = '生效' 的职位。
 */
exports.main = (event, context) => {
  
  // 1. 先进行聚合查询，获取所有不重复的职位类型，并进行分组和截取
  return db.collection('jobs').aggregate()
    .match({
      // ⭐ 关键修正：增加 status = '生效' 的筛选条件
      status: '生效',
      // 确保 type 字段存在且非空
      type: db.command.exists(true)
    })
    .sort({
      // 排序规则 (可以根据 createdAt 排序，确保最新的职位在前)
      createdAt: -1 
    })
    .group({
      // 2. 按 'type' 字段进行分组
      _id: '$type',
      // 将属于同一分组的文档收集到一个数组中
      products: $.push({
        title: '$title',
        // ⭐ 关键修正：添加所有新的结构化字段
        jobDuty: '$jobDuty',
        qualification: '$qualification',
        salaryRange: '$salaryRange',
        createdAt: '$createdAt',
        // ----------------------------------------------------
        img: '$img',
        id: '$_id' // 方便前端跳转详情页
      })
    })
    .project({
      // 3. 截取每个分组的前 3 条数据
      name: '$_id', // 分组名称
      products: $.slice(['$products', 3]) // $slice 用法
    })
    .end()
    .then(res => {
      // 聚合查询成功
      return {
        success: true,
        categories: res.list 
      };
    })
    .catch(err => {
      // 聚合查询失败
      console.error("获取职位分组列表失败", err);
      return {
        success: false,
        error: err.errMsg || '获取数据失败'
      };
    });
};