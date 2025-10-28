// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 数据库引用
const db = cloud.database();
const collection = db.collection('binners');

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取 binners 集合中的所有数据
    const res = await collection.limit(100).get();

    // 格式化数据，只保留 img 字段，并对 url 进行去空格处理
    const bannerList = res.data.map(item => {
      // 获取 img 字段，如果存在则进行去空格操作，否则为空字符串
      const url = item.img ? item.img.trim() : ''; 
      
      return {
        id: item._id, 
        url: url, // 关键修改：对 img 字段的值进行了 trim() 去空格
        link: item.link || '', // 确保 link 字段存在，防止 goToBannerDetail 报错
      };
    });

    return {
      code: 0,
      success: true,
      bannerList: bannerList,
      msg: '获取轮播图成功'
    };
  } catch (e) {
    console.error('获取轮播图失败：', e);
    return {
      code: -1,
      success: false,
      msg: '数据库操作失败',
      error: e.toString()
    };
  }
};