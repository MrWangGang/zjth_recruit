const app = getApp();

Page({
    data: {
        statusBarHeight: 0,
        isLoggedIn: false,
        userInfo: {},

        pets: [],
        deliveries: [], // 我的投递列表
        activeTab: 'delivery',

        // ⭐ 新增分页状态变量
        pageIndex: 1,
        pageSize: 10,
        hasMore: true, // 是否还有更多数据
        isLoadMore: false, // 是否正在加载更多

        // ⭐ 关键修正：移除未使用的图片路径
        cloudPaths: {
            background: 'cloud://cloud1-5gubwxe85b798ff4.636c-cloud1-5gubwxe85b798ff4-1381914959/素材/myself_back.png',
            editIcon: 'cloud://cloud1-5gubwxe85b798ff4.636c-cloud1-5gubwxe85b798ff4-1381914959/素材/myself_button_edit.png',
            settingIcon: 'cloud://cloud1-5gubwxe85b798ff4.636c-cloud1-5gubwxe85b798ff4-1381914959/素材/myself_button_setting.png',
            bubble: 'cloud://cloud1-5gubwxe85b798ff4.636c-cloud1-5gubwxe85b798ff4-1381914959/素材/myself_pet_back.png',
            defaultAvatar: 'cloud://cloud1-5gubwxe85b798ff4.636c-cloud1-5gubwxe85b798ff4-1381914959/素材/myself_pet_avatar.png',
        },
    },

    onLoad: function() {
        const systemInfo = wx.getSystemInfoSync();
        this.setData({
            statusBarHeight: systemInfo.statusBarHeight
        });
    },

    onShow: function() {
        this.checkLoginAndLoadData();
        // 确保每次 onShow 都重置分页状态并重新加载第一页
        this.resetDeliveriesData();
        this.loadDeliveriesData();
    },

    /** 监听用户下拉动作 */
    onPullDownRefresh: function() {
        this.resetDeliveriesData();
        this.loadDeliveriesData(true); // 传入 true 表示是下拉刷新
    },

    /** 监听页面触底事件 */
    onReachBottom: function() {
        if (this.data.hasMore && !this.data.isLoadMore) {
            this.loadDeliveriesData();
        } else if (!this.data.hasMore) {
            wx.showToast({ title: '没有更多投递记录了', icon: 'none' });
        }
    },

    // --- 辅助函数 ---
    processTimeRange: function(timeRange) {
        if (!timeRange) return '';
        var parts = timeRange.split(/\s+/);
        return parts[0];
    },

    /** 辅助函数：格式化时间 */
    formatDate: function(dateObject) {
        if (!dateObject) return '';
        // 假设 dateObject 是云数据库返回的 Date 类型对象或时间戳
        const date = new Date(dateObject);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /** 辅助函数：重置投递记录和分页状态 */
    resetDeliveriesData: function() {
        this.setData({
            deliveries: [],
            pageIndex: 1,
            hasMore: true,
            isLoadMore: false
        });
    },

    // ⭐ 核心：加载投递记录 (支持分页)
    loadDeliveriesData: function(isPullDown = false) {
        if (!this.data.hasMore && !isPullDown) return;
        if (this.data.isLoadMore) return;

        var cachedUserInfo = wx.getStorageSync('userInfo');
        var userId = cachedUserInfo ? (cachedUserInfo._id || cachedUserInfo.userId) : null;

        if (!userId) {
            this.setData({ deliveries: [] });
            if (isPullDown) wx.stopPullDownRefresh();
            return;
        }

        this.setData({ isLoadMore: true });
        if (!isPullDown) wx.showLoading({ title: '加载中...', mask: true });


        wx.cloud.callFunction({
            name: 'getUserDeliveries', // 调用查询投递记录的云函数
            data: {
                userId: userId,
                pageIndex: this.data.pageIndex,
                pageSize: this.data.pageSize
            }
        }).then(res => {
            wx.hideLoading();
            if (isPullDown) wx.stopPullDownRefresh();
            
            // 假设云函数返回 code: 0 或 success: true
            if (res.result && res.result.success) {
                var { deliveries: rawDeliveries, total, pageIndex: newPageIndex, hasMore } = res.result;

                var formattedDeliveries = rawDeliveries.map(item => {
                    const deliverDate = item.deliveryDate || item.createdAt;
                    
                    return {
                        _id: item._id,
                        job_name: item.job_name || '职位信息缺失',
                        image: item.job_img || this.data.cloudPaths.defaultAvatar,
                        deliver_date: this.formatDate(deliverDate),
                        job_type: item.job_type || '未知类型',
                        salary_range: item.salary_range || '面议',
                        job_duty: item.job_duty || '暂无职位职责描述', 
                        // ⭐ 关键：确保映射字段名为 job_id (小写下划线)
                        job_id: item.jobId, 
                    };
                });

                this.setData({
                    // 如果是下拉刷新，直接覆盖列表；否则追加
                    deliveries: isPullDown ? formattedDeliveries : this.data.deliveries.concat(formattedDeliveries),
                    pageIndex: newPageIndex + 1, // 准备加载下一页
                    hasMore: hasMore,
                    isLoadMore: false
                });

            } else {
                console.error('loadDeliveriesData: 云函数调用失败或返回错误:', res.result);
                this.setData({ isLoadMore: false });
                if (this.data.pageIndex === 1) {
                     this.setData({ deliveries: [] });
                }
                wx.showToast({ title: '投递记录加载失败', icon: 'none' });
            }
        }).catch(e => {
            wx.hideLoading();
            if (isPullDown) wx.stopPullDownRefresh();
            console.error('loadDeliveriesData: 云函数调用异常', e);
            this.setData({ isLoadMore: false });
            if (this.data.pageIndex === 1) {
                this.setData({ deliveries: [] });
            }
            wx.showToast({ title: '网络错误', icon: 'none' });
        });
    },

    // --- 核心功能：检查登录状态并加载数据 ---
    checkLoginAndLoadData: function() {
        var cachedUserInfo = wx.getStorageSync('userInfo');
        var userToken = wx.getStorageSync('userToken');

        var userId = cachedUserInfo ? (cachedUserInfo._id || cachedUserInfo.userId) : null;

        if (cachedUserInfo && userToken && userId) {
            console.log('checkLoginAndLoadData: 登录状态：已登录。');

            var userInfoToSet = {};
            for (var key in cachedUserInfo) {
                if (cachedUserInfo.hasOwnProperty(key)) {
                    userInfoToSet[key] = cachedUserInfo[key];
                }
            }

            userInfoToSet.name = cachedUserInfo.nickName || '用户';
            userInfoToSet.avatar = cachedUserInfo.avatarUrl || this.data.cloudPaths.defaultAvatar;
            userInfoToSet.phone = cachedUserInfo.phone || null;
            userInfoToSet.userId = userId;

            this.setData({
                isLoggedIn: true,
                userInfo: userInfoToSet,
            });

        } else {
            console.log('checkLoginAndLoadData: 登录状态：未登录。');

            this.setData({
                isLoggedIn: false,
                userInfo: { name: '点击登录/注册', avatar: this.data.cloudPaths.defaultAvatar, phone: null },
                deliveries: [],
                pageIndex: 1, // 重置分页
                hasMore: true, // 重置分页
            });
        }
    },

    // --- 流程和跳转功能 ---
    onLoginSuccess: function(e) {
        if (e.detail && e.detail.userInfo) {
             wx.setStorageSync('userInfo', e.detail.userInfo);
        }
        this.checkLoginAndLoadData();
        this.resetDeliveriesData(); // 重置并加载第一页
        this.loadDeliveriesData();
    },

    goToWork: function() {
        this.goToEditProfile();
    },

    goToEditProfile: function() {
        if (!this.data.isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }
        var userId = this.data.userInfo.userId;
        if (!userId) {
            wx.showToast({ title: '用户ID缺失，无法编辑', icon: 'none' });
            return;
        }
        wx.navigateTo({ url: '/pages/myself/edit/index?userId=' + userId });
    },

    goToSettings: function() {
        var userId = this.data.userInfo.userId;
        if (!userId) {
            wx.showToast({ title: '用户ID缺失，请先登录', icon: 'none' });
            return;
        }
        wx.navigateTo({ url: '/pages/myself/setting/index?userId=' + userId });
    },

    switchTab: function(e) {
        this.setData({ activeTab: e.currentTarget.dataset.tab });
    },

    // ⭐ 修复：健壮地获取 jobId
    goToDeliveryDetail: function(e) {
        // 从 data-job-id 获取参数 (小驼峰)
        var jobId = e.currentTarget.dataset.jobId; 
        
        // 验证 jobId 是否有效
        if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
             console.error('goToDeliveryDetail: 职位ID缺失或无效:', jobId);
             wx.showToast({ title: '职位ID缺失', icon: 'none' });
             return;
        }
        
        // 跳转到职位详情页
        wx.navigateTo({
            url: '/pages/job/detail/index?jobId=' + jobId
        });
    },
});