const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV 
});

// 获取数据库引用
const db = cloud.database();

/**
 * 云函数入口函数
 * @param {Object} event - 触发云函数的事件参数 (包含 params: { jobType, jobTitle, startDate, endDate })
 * @param {Object} context - 运行时环境信息
 */
exports.main = async (event, context) => {
  console.log('云函数 test 接收到的参数 event:', event);

  // 1. 从事件参数中解构所需字段，并提供合理的默认值或空值
  const { 
    jobType, 
    jobTitle, 
    startDate, // 毫秒级时间戳，例如 1761235200000
    endDate    // 毫秒级时间戳，例如 1761926399999
  } = event; 

  // 2. 构造 delivery 表的筛选条件
  const deliveryMatch = {};
  if (startDate && endDate) {
    deliveryMatch.createdAt = {
      // 确保 startDate 和 endDate 是有效的数字
      "$gte": Number(startDate),
      "$lte": Number(endDate)
    };
  }

  // 3. 构造 jobs 表的筛选条件 (将在 $lookup 阶段的 pipeline 中使用)
  const jobMatch = {};
  if (jobType) {
    jobMatch.type = jobType;
  }
  // 注意：如果 jobTitle 是模糊匹配，需要使用正则表达式，否则使用精确匹配
  if (jobTitle) {
    // 假设是精确匹配
    jobMatch.title = jobTitle; 
    // 如果是模糊匹配，可以使用：jobMatch.title = { $regex: jobTitle, $options: 'i' }; 
  }

  // 4. 限制数量
  const limitCount = event.limit || 200;


  try {
    // 构造 MongoDB 的 db.runCommand 聚合查询
    const aggregateCommand = {
      "aggregate": "delivery",
      "pipeline": [
        
        // 阶段 1: 筛选 delivery.createdAt
        {
          "$match": deliveryMatch // 应用 delivery 集合的时间筛选
        },

        // 阶段 2: 连接 jobs 集合并应用 jobs 的筛选条件
        {
          "$lookup": {
            "from": "jobs",           
            "localField": "jobId",    
            "foreignField": "_id",    
            "as": "jobDetails",       
            // 在 $lookup 中使用 pipeline 来应用 jobType 和 jobTitle 的筛选
            "pipeline": [
                { "$match": jobMatch }
            ]
          }
        },
        
        // 阶段 3: 解构 jobDetails 数组
        {
          "$unwind": {
            "path": "$jobDetails"
            // 注意：这里移除了 preserveNullAndEmptyArrays: true
            // 因为我们只想要匹配到 jobs 集合中符合 type/title 筛选条件的 delivery 记录
          }
        },

        // 阶段 4: 连接 users 集合
        {
          "$lookup": {
            "from": "users",          
            "localField": "userId",   
            "foreignField": "_id",    
            "as": "userDetails"      
          }
        },
        // 阶段 5: 解构 userDetails 数组 (保留未匹配的用户，但通常用户ID应该总是匹配)
        {
          "$unwind": {
            "path": "$userDetails",
            "preserveNullAndEmptyArrays": true 
          }
        },

        // 阶段 6: 投影 (Project) 所需字段
        {
          "$project": {
            "_id": 0,
            "deliveryId": "$_id",
            "deliveryCreatedAt": { "$toDate": "$createdAt" }, 
            
            // users 的字段
            "nickName": "$userDetails.nickName",
            "age": "$userDetails.age",
            "education": "$userDetails.education",
            "gender": "$userDetails.gender",
            "graduationDate": "$userDetails.graduationDate",
            "isFullTime": "$userDetails.isFullTime",
            "major": "$userDetails.major",
            "phone": "$userDetails.phone",
            "region": "$userDetails.region",
            "schoolName": "$userDetails.schoolName",
            "resumeFileID": "$userDetails.resumeFileID",
            
            // jobs 的字段
            "jobStatus": "$jobDetails.status",
            "jobTitle": "$jobDetails.title",
            "jobType": "$jobDetails.type",
            "salaryRange": "$jobDetails.salaryRange"
          }
        },
        
        // 阶段 7: 排序
        {
          "$sort": {
            "deliveryCreatedAt": 1
          }
        },
        
        // 阶段 8: 限制数量
        {
          "$limit": limitCount
        }
      ],
      "cursor": {}
    };

    // 执行 db.runCommand
    const result = await db.command(aggregateCommand);
    
    return {
      code: 0,
      success: true,
      data: result.list || result.result.cursor.firstBatch, 
      message: '查询成功'
    };

  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      code: -1,
      success: false,
      message: '查询失败',
      error: error.message
    };
  }
};