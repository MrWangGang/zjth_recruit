// index.js (首页文件)

Page({
    
  data: {    
    // 移除了 isLoggedIn, showAuthModal, pendingAction, pendingParams
    currentTab: 'knowledge',
    statusBarHeight: 0,            
    navBarHeight: 0,               
    navBarContentHeight: 0,          

    bannerList: [],
    towerItems: [], 
    
    mainImageUrl: '',
    storeList: [],

    categories: [], // 动态职位数据
  },

  // 移除了 checkLoginAndExecute, onLoginSuccess, checkLoginStatus 

  // ------------------------- 职位详情相关 -------------------------

  /**
   * 跳转到职位详情页 (Job Detail Page)
   * 逻辑不再有登录检查，直接跳转
   */
  goJobDetail: function(e) {
    // 从 WXML data-job-id="{{product.id}}" 获取
    const jobId = e.currentTarget.dataset.jobId; 
    
    if (!jobId) {
        wx.showToast({ title: '职位ID缺失', icon: 'none' });
        console.error('跳转失败：未找到职位ID');
        return;
    }
    
    wx.navigateTo({
        url: '/pages/job/detail/index?jobId=' + jobId
    });
  },
    
  // ------------------------- 导航区跳转函数 -------------------------
  
  /** 导航到更多职位列表页 */
  goToStore: function() {
      // 导航到更多职位列表页 (不需要登录)
      wx.navigateTo({ url: '/pages/job/index' });
  },

  /** 导航到我的投递 */
  goToPets: function() {
      // 导航到我的投递 (如果 '我的投递' 页面是 TabBar 页面，保持 switchTab)
      // 注意：虽然页面不需要登录，但 '我的投递' 页面可能依然需要检查用户是否已登录才能显示数据
      wx.switchTab({ url: '/pages/myself/index' });
  },

  // --- 以下导航功能默认不需要登录，保持不变 ---

  goToRights: function() {
    // 导航到公司简介
    wx.navigateTo({ url: '/pages/brief/index' });
  },
  goToHealth: function() {
    // 导航到员工关怀
    wx.navigateTo({ url: '/pages/care/index' });
  },
  goToBannerDetail: function(e) {
    // 处理 banner 点击跳转
    const link = e.currentTarget.dataset.link;
    if (link) {
        wx.navigateTo({ url: link });
    }
  },
  goToActivityBlock: function() {
     // 跳转到招聘海报页 (左侧块)
     wx.navigateTo({ url: '/pages/job/index' });
  },
  goToAllianceBlock: function() {
     // 跳转到热门职位列表 (右侧块)
     wx.navigateTo({ url: '/pages/job/index' });
  },

  // ------------------------- 数据加载和生命周期 -------------------------

  /**
   * 【独立加载函数 A】加载职位分类数据 (Categories & TowerItems)
   */
  getJobCategoriesData: function() {
    wx.showLoading({
        title: '加载职位中...'
    });

    wx.cloud.callFunction({
        name: 'getJobListGrouped',
        data: {},
        success: (jobsRes) => {
            wx.hideLoading();

            if (!jobsRes.result || !jobsRes.result.success) {
                console.error('获取职位数据失败:', jobsRes.result ? jobsRes.result.error : '未知错误');
                wx.showToast({ title: '职位数据加载失败', icon: 'none' });
                return;
            }
            
            const fetchedCategories = jobsRes.result.categories;
            
            // 1.1. 生成底部分类列表 (categories)
            const categoryData = fetchedCategories.map(item => {
                const products = Array.isArray(item.products) ? item.products : [];

                return ({
                    name: item.name,
                    subtext: `精选${item.name}职位推荐`,
                    products: products.map(product => ({
                        id: product.id,
                        title: product.title, 
                        img: product.img,
                        salaryRange: product.salaryRange 
                    }))
                });
            });

            // 1.2. 生成右侧轮播图数据 (towerItems)
            const towerItemsData = fetchedCategories
              .filter(item => item.products && item.products.length > 0)  
              .map((item, index) => {
                const firstJob = item.products[0];
                return {
                  id: index + 1, 
                  url: firstJob.img, 
                  text: item.name 
                };
              });
            
            // 独立更新数据
            this.setData({
              categories: categoryData,
              towerItems: towerItemsData
            });
            console.log('职位数据和轮播图数据独立加载成功！');
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('调用 getJobListGrouped 云函数失败:', err);
            wx.showToast({ title: '职位数据网络失败', icon: 'none' });
          }
    });
  },

  /**
   * 【独立加载函数 B】仅获取 Banner 列表数据 (保持不变)
   */
  getBannerData: function() {
    wx.cloud.callFunction({
        name: 'getBinners',
        data: {},
        success: (bannerRes) => {
            
            const bannerList = (bannerRes.result && bannerRes.result.code === 0)  
                                     ? bannerRes.result.bannerList  
                                     : [];

            this.setData({
              bannerList: bannerList  
            });
            console.log('Banner 数据独立加载完成！');
          },
          fail: (err) => {
            console.error('Banner 数据加载失败:', err);
          }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 动态计算导航栏高度 (保持不变)
    const systemInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarContentHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
    const navBarHeight = statusBarHeight + navBarContentHeight;

    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: navBarHeight,
      navBarContentHeight: navBarContentHeight,
      categories: [],
      towerItems: []
    });

    // 核心：在 onLoad 里并行调用两个数据加载函数
    this.getJobCategoriesData();
    this.getBannerData();
  },
  onUnload: function () {},
});