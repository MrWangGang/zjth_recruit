// cloud/getJobList/index.js
// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化 cloud，使用当前云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) 

const db = cloud.database()
const _ = db.command // 引入数据库操作符

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('--- getJobList 云函数开始执行 (已启用 status="生效" 过滤) ---');
  const wxContext = cloud.getWXContext();
  console.log(`OpenID: ${wxContext.OPENID}`);

  try {
    
    // --- 1. 获取所有职位分类 (category) 的原始数据 ---
    console.log('尝试查询 [category] 集合...');
    const categoriesResult = await db.collection('category').get();
    const rawCategories = categoriesResult.data;
    console.log(`[category] 集合查询成功，共 ${rawCategories.length} 条记录。`);
    
    // --- 2. 获取所有“生效”的职位列表 (jobs) 的原始数据 ---
    console.log('尝试查询 [jobs] 集合，过滤 status = "生效"...');
    
    // ⭐ 关键修改：添加 where 条件
    const jobListResult = await db.collection('jobs')
      .where({
        status: _.eq('生效') // 只查询 status 字段等于 '生效' 的记录
      })
      .get();

    const rawJobList = jobListResult.data;
    console.log(`[jobs] 集合查询成功，已过滤，共 ${rawJobList.length} 条“生效”记录。`);
    
    // 返回原始的查询结果数据
    console.log('云函数准备返回成功数据。');
    return {
      code: 0,
      rawCategories: rawCategories,
      rawJobList: rawJobList,
      openid: wxContext.OPENID,
      message: '原始数据获取成功'
    }

  } catch (err) {
    // 捕获数据库或其他操作的错误
    console.error('--- 云函数执行失败 ---');
    console.error('详细错误信息:', err);
    
    return {
      code: -1,
      message: '数据获取失败，请检查数据库连接、权限或集合名称。',
      error: err.message, 
      openid: wxContext.OPENID
    }
  } finally {
    console.log('--- getJobList 云函数执行结束 ---');
  }
}