// pages/index/index.js
const db = wx.cloud.database();

/**
 * 辅助函数：将职位列表中的 job.createdAt 字段格式化为 YYYY-MM-DD
 * @param {Array} jobList 原始职位列表
 * @returns {Array} 格式化后的职位列表
 */
function formatJobDates(jobList) {
  if (!jobList || jobList.length === 0) {
    return [];
  }
  
  return jobList.map(job => {
    // 假设 job.createdAt 是一个包含时间戳的字符串，如 "2025-10-28 09:30:00"
    if (typeof job.createdAt === 'string' && job.createdAt.length >= 10) {
      // 截取前 10 位，以实现 YYYY-MM-DD 格式
      job.createdAt = job.createdAt.slice(0, 10);
    }
    return job;
  });
}


Page({
  data: {
    // 左侧职位分类列表 (包含原始字段和 isActive 状态)
    categories: [],
    // 完整的原始职位列表 (从云函数获取后存储)
    fullJobList: [], 
    // 当前显示的职位列表 (根据分类过滤后的结果)
    jobList: [], 
    
    // 当前激活的分类 ID (原始的 type 字符串)
    currentCategoryType: '',
    // 当前激活的分类名称 (原始的 type 字符串)
    currentCategoryName: '所有职位'
  },

  onLoad() {
    if (!wx.cloud) {
        console.error('请确保在 app.js 中初始化云环境');
    }
    this.fetchDataFromCloud();
  },

  /**
   * 从云函数获取原始招聘数据并处理
   */
  fetchDataFromCloud() {
    wx.cloud.callFunction({
      name: 'getJobList',
      success: (res) => {
        if (res.result.code === 0) {
          let { rawCategories, rawJobList } = res.result;

          // ⭐⭐⭐ 关键修改：在设置数据之前格式化日期 ⭐⭐⭐
          const formattedJobList = formatJobDates(rawJobList);

          // 1. 转换 categories 格式，添加 isActive 状态
          const categories = rawCategories.map((item, index) => ({
            ...item, // 包含原始字段 (_id, type)
            isActive: index === 0  // 默认第一个分类激活
          }));

          // 2. 设置完整的原始职位列表 (已格式化日期)
          this.data.fullJobList = formattedJobList;

          // 3. 确定默认激活的分类 type 和 name (使用 type 字段)
          let defaultCategory = categories[0];
          const defaultCategoryType = defaultCategory ? defaultCategory.type : '';
          const defaultCategoryName = defaultCategory ? defaultCategory.type : '所有职位';

          this.setData({
            categories: categories,
            currentCategoryType: defaultCategoryType,
            currentCategoryName: defaultCategoryName,
          }, () => {
            // 4. 过滤并显示默认分类的职位
            this.filterJobList();
          });

        } else {
          wx.showToast({ title: '加载失败', icon: 'error', duration: 1500 });
        }
      },
      fail: (err) => {
        console.error('调用云函数失败', err);
        wx.showToast({ title: '网络错误或云函数异常', icon: 'none', duration: 1500 });
      }
    });
  },

  /**
   * 过滤职位列表 (使用原始字段名 type 进行过滤)
   */
  filterJobList() {
    const { currentCategoryType, fullJobList } = this.data;
    
    // 如果当前分类是 '所有职位' (假设rawCategories的第一个元素是'所有职位'或'全部')
    let filteredList;
    if (currentCategoryType === '所有职位' || currentCategoryType === '全部') {
        filteredList = fullJobList;
    } else {
        filteredList = fullJobList.filter(job => job.type === currentCategoryType);
    }

    this.setData({
      jobList: filteredList // 更新右侧列表
    });
  },

  /**
   * 改变左侧分类
   */
  changeCategory(e) {
    const newCategoryType = e.currentTarget.dataset.type; 
    const { categories } = this.data;

    // 1. 更新激活状态
    const newCategories = categories.map(cat => ({ 
      ...cat,
      isActive: cat.type === newCategoryType // 使用 type 进行对比
    }));
    
    // 2. 获取新的分类名称 (即 type)
    const newCategory = newCategories.find(cat => cat.type === newCategoryType);
    const newCategoryName = newCategory ? newCategory.type : '未知分类';

    this.setData({
      categories: newCategories,
      currentCategoryType: newCategoryType,
      currentCategoryName: newCategoryName
    }, () => {
      // 3. 重新过滤职位列表
      this.filterJobList();
    });
  },
  
  /**
   * 跳转到职位详情页
   */
  goToJobDetail(e) {
    const jobId = e.currentTarget.dataset.jobId; 
    
    if (!jobId) {
      wx.showToast({ title: '职位ID缺失', icon: 'none' });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/job/detail/index?jobId=${jobId}`
    });
  }
})
