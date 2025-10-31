// index.js (分步查询与数据组合版本)
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV 
});

const db = cloud.database();
const MAX_LIMIT = 100; // 每次查询 delivery 集合的最大限制

exports.main = async (event, context) => {
  try {
    const deliveryCollection = db.collection('delivery');
    const usersCollection = db.collection('users');
    const jobsCollection = db.collection('jobs');

    // 1. 查询 delivery 集合 (按 createdAt 倒序排序，限制 100 条)
    const deliveryRes = await deliveryCollection
      .orderBy('createdAt', 'desc')
      .limit(MAX_LIMIT)
      .get();
      
    const deliveryList = deliveryRes.data;

    if (deliveryList.length === 0) {
      return {
        code: 0,
        msg: '查询成功',
        data: [],
      };
    }
    
    // 提取所有独特的 userId 和 jobId
    const userIds = [...new Set(deliveryList.map(item => item.userId))];
    const jobIds = [...new Set(deliveryList.map(item => item.jobId))];

    // 2. 并发查询 users 和 jobs 集合
    const [usersRes, jobsRes] = await Promise.all([
      // 查询所有需要的 users 信息
      usersCollection.where({
        _id: db.command.in(userIds)
      }).get(),
      
      // 查询所有需要的 jobs 信息
      jobsCollection.where({
        _id: db.command.in(jobIds)
      }).get()
    ]);

    // 3. 将查询结果转换为 Map，方便 O(1) 查找
    const usersMap = new Map();
    usersRes.data.forEach(user => {
      usersMap.set(user._id, user);
    });

    const jobsMap = new Map();
    jobsRes.data.forEach(job => {
      jobsMap.set(job._id, job);
    });

    // 4. 组合数据并筛选出所需字段
    const combinedData = deliveryList.map(delivery => {
      const user = usersMap.get(delivery.userId) || {}; // 找不到则为空对象
      const job = jobsMap.get(delivery.jobId) || {};     // 找不到则为空对象
      
      return {
        _id: delivery._id,
        createdAt: delivery.createdAt,
        
        // Users 字段
        nickName: user.nickName,
        age: user.age,
        education: user.education,
        gender: user.gender,
        graduationDate: user.graduationDate,
        isFullTime: user.isFullTime,
        major: user.major,
        phone: user.phone,
        region: user.region,
        schoolName: user.schoolName,
        resumeFileID: user.resumeFileID,

        // Jobs 字段
        status: job.status,
        title: job.title,
        type: job.type,
        salaryRange: job.salaryRange,
      };
    }).filter(item => item.nickName !== undefined && item.title !== undefined); 
    // ^ 可选：如果用户或职位不存在，可以过滤掉这条记录

    // 5. 返回最终结果
    return {
      code: 0,
      msg: '查询成功',
      data: combinedData,
    };

  } catch (err) {
    console.error('[云函数 getDeliveryDetails] 错误:', err);
    return {
      code: 1,
      msg: '查询失败',
      error: err.message,
    };
  }
};