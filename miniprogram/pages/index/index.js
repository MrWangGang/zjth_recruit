// index.js (首页文件)

Page({
    
  data: {    
    isLoggedIn: false,
    currentTab: 'knowledge',

    statusBarHeight: 0,           
    navBarHeight: 0,              
    navBarContentHeight: 0,       

    bannerList: [],
    towerItems: [], 
    
    mainImageUrl: '',
    storeList: [],

    categories: [], // 动态职位数据
    
    // 关键：用于跳转到职位详情页的路径
  },

  
  /**
   * 【独立加载函数 A】加载职位分类数据 (Categories & TowerItems)
   * ⭐ 适配新的结构化字段
   */
  getJobCategoriesData: function() {
    wx.showLoading({
      title: '加载职位中...'
    });

    wx.cloud.callFunction({
      name: 'getJobListGrouped', // 此云函数必须返回 jobDuty, qualification, salaryRange, createdAt
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
                    // 确保返回薪酬范围，方便在卡片上展示 (如果 WXML 需要)
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
              url: firstJob.img, // 图片路径
              text: item.name // 类别名称
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
  * 跳转到职位详情页 (Job Detail Page)
  * ⭐ 关键：绑定到 product-card
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

  /**
   * 【独立加载函数 B】仅获取 Banner 列表数据 (保持不变)
   */
  getBannerData: function() {
    
    wx.cloud.callFunction({
      name: 'getBinners', // 假设 Banner 云函数名为 getBinners
      data: {},
      success: (bannerRes) => {
        
        const bannerList = (bannerRes.result && bannerRes.result.code === 0) 
                             ? bannerRes.result.bannerList 
                             : [];

        // 独立设置 Banner 数据
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
  
  /** 4. 登录成功回调（通常由 authorize 组件触发） */
  onLoginSuccess: function() {
    this.checkLoginAndLoadData();
  },
  
  /** 3. 检查登录状态并加载数据 (逻辑已简化，仅用于登录状态检查) */
  checkLoginAndLoadData: function() {
    var cachedUserInfo = wx.getStorageSync('userInfo');
    var userToken = wx.getStorageSync('userToken');
    
    if (cachedUserInfo && userToken && (cachedUserInfo.userId || cachedUserInfo._id)) {
        console.log('checkLoginAndLoadData: 登录状态：已登录。');

        var userInfoToSet = {};
        for (var key in cachedUserInfo) {
            if (cachedUserInfo.hasOwnProperty(key)) {
                userInfoToSet[key] = cachedUserInfo[key];
            }
        }
        
        userInfoToSet.phone = cachedUserInfo.phone || null; 
        
        this.setData({
            isLoggedIn: true,
            userInfo: userInfoToSet, 
            isVIPActive: cachedUserInfo.isVip || false,
        });
    } else {
        console.log('checkLoginAndLoadData: 登录状态：未登录。');
        
        this.setData({ 
            isLoggedIn: false, 
            userInfo: { phone: null },
            isVIPActive: false, 
        });
    }
  },
    // --- 导航区跳转函数 (假设的路径，实际需要根据项目结构调整) ---
    goToStore: function() {
      // 导航到更多职位列表页
      wx.navigateTo({ url: '/pages/job/index' });
    },
    goToRights: function() {
      // 导航到公司简介
      wx.navigateTo({ url: '/pages/brief/index' });
    },
    goToHealth: function() {
      // 导航到招聘章程
      wx.navigateTo({ url: '/pages/care/index' });
    },
    goToPets: function() {
      // 导航到我的投递
      wx.switchTab({ url: '/pages/myself/index' });
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
});